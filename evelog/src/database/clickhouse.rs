use crate::config::ClickhouseCfg;
use anyhow::{Result, anyhow, bail};
use clickhouse::{Client, RowOwned, RowWrite, inserter::Inserter};
use eveschema::clickhouse::eve_alert::{EVE_ALERT_SCHEMA_CREATE_SQL, EveAlertSchema};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio::runtime::Handle;
use tokio::task::JoinHandle;
use tokio::time::MissedTickBehavior;
use tracing::{error, info};

static EVENT_WRITER: OnceLock<EventWriterHandle> = OnceLock::new();

#[derive(Debug, Clone)]
pub enum Event {
    Alert(EveAlertSchema),
    // Future event types are added here, e.g. Http(EveHttpSchema).
}

struct EventWriterHandle {
    tx: flume::Sender<Event>,
    shutdown_tx: flume::Sender<()>,
    handle: Mutex<Option<JoinHandle<Result<()>>>>,
}

struct EventWriter {
    alert: BatchWriter<EveAlertSchema>,
    // Future event types:
    // http: BatchWriter<EveHttpSchema>,
    // dns: BatchWriter<EveDnsSchema>,
}

impl EventWriter {
    fn new(client: Client, cfg: &ClickhouseCfg) -> Self {
        Self {
            alert: BatchWriter::new(client.clone(), "eve_alert_log", cfg.batch_size),
        }
    }

    async fn write(&mut self, event: Event) {
        match event {
            Event::Alert(row) => self.alert.write_row(&row).await,
            // EveEvent::Http(row) => self.http.write_row(&row).await,
            // EveEvent::Dns(row) => self.dns.write_row(&row).await,
        }
    }

    async fn flush(&mut self) {
        self.alert.flush().await;
    }

    async fn end(self) {
        self.alert.end().await;
    }
}

struct BatchWriter<T> {
    client: Client,
    table: String,
    batch_size: usize,
    inserter: Inserter<T>,
}

impl<T> BatchWriter<T>
where
    T: RowOwned + RowWrite + Send + 'static,
{
    fn new(client: Client, table: &str, batch_size: usize) -> Self {
        let inserter = client.inserter::<T>(table).with_max_rows(batch_size as u64);

        Self {
            client,
            table: table.to_string(),
            batch_size,
            inserter,
        }
    }

    fn reset_inserter(&mut self) {
        self.inserter = self
            .client
            .inserter::<T>(&self.table)
            .with_max_rows(self.batch_size as u64);
    }

    async fn write_row(&mut self, row: &T) {
        if let Err(err) = self.inserter.write(row).await {
            error!(
                table = %self.table,
                error = %err,
                "failed to write event row, dropping current inserter state"
            );
            self.reset_inserter();
            return;
        }

        if let Err(err) = self.inserter.commit().await {
            error!(
                table = %self.table,
                error = %err,
                "failed to commit event batch, dropping current inserter state"
            );
            self.reset_inserter();
        }
    }

    async fn flush(&mut self) {
        if let Err(err) = self.inserter.force_commit().await {
            error!(
                table = %self.table,
                error = %err,
                "failed to flush event batch, dropping current inserter state"
            );
            self.reset_inserter();
        }
    }

    async fn end(self) {
        if let Err(err) = self.inserter.end().await {
            error!(
                table = %self.table,
                error = %err,
                "failed to end event writer"
            );
        }
    }
}

pub async fn init_clickhouse_db(cfg: &ClickhouseCfg) -> Result<()> {
    let client = Client::default()
        .with_url(&cfg.url)
        .with_database(&cfg.database)
        .with_user(&cfg.user)
        .with_password(&cfg.password)
        .with_setting("session_timezone", "UTC");

    create_tables(&client).await?;
    start_writer(client, cfg)?;

    Ok(())
}

async fn create_tables(client: &Client) -> Result<()> {
    client.query(EVE_ALERT_SCHEMA_CREATE_SQL).execute().await?;

    Ok(())
}

pub fn submit_event(event: Event) -> Result<()> {
    let writer = EVENT_WRITER
        .get()
        .ok_or_else(|| anyhow!("Event writer not initialized"))?;

    writer
        .tx
        .send(event)
        .map_err(|_| anyhow!("Event writer channel closed"))?;

    Ok(())
}

fn start_writer(client: Client, cfg: &ClickhouseCfg) -> Result<()> {
    if EVENT_WRITER.get().is_some() {
        bail!("Event writer already initialized");
    }

    let (tx, rx) = flume::bounded(cfg.batch_size);
    let (shutdown_tx, shutdown_rx) = flume::bounded(1);
    let flush_interval = Duration::from_millis(cfg.flush_interval_ms);

    let writer = EventWriter::new(client, cfg);
    let handle = tokio::spawn(run_writer(writer, rx, shutdown_rx, flush_interval));

    let writer_handle = EventWriterHandle {
        tx,
        shutdown_tx,
        handle: Mutex::new(Some(handle)),
    };

    EVENT_WRITER
        .set(writer_handle)
        .map_err(|_| anyhow!("Event writer already initialized"))?;

    info!("Event writer initialized");

    Ok(())
}

async fn run_writer(
    mut writer: EventWriter,
    rx: flume::Receiver<Event>,
    shutdown_rx: flume::Receiver<()>,
    flush_interval: Duration,
) -> Result<()> {
    let mut ticker = tokio::time::interval(flush_interval);
    ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);

    loop {
        tokio::select! {
            event = rx.recv_async() => {
                match event {
                    Ok(event) => writer.write(event).await,
                    Err(_) => break,
                }
            }
            _ = shutdown_rx.recv_async() => {
                while let Ok(event) = rx.try_recv() {
                    writer.write(event).await;
                }
                break;
            }
            _ = ticker.tick() => {
                writer.flush().await;
            }
        }
    }

    writer.end().await;

    Ok(())
}

async fn shutdown_writer() -> Result<()> {
    let Some(writer) = EVENT_WRITER.get() else {
        return Ok(());
    };

    // A full shutdown channel means a shutdown is already pending.
    let _ = writer.shutdown_tx.try_send(());

    let handle = writer
        .handle
        .lock()
        .expect("Event writer handle mutex poisoned")
        .take();

    if let Some(handle) = handle {
        match handle.await {
            Ok(result) => result,
            Err(err) => Err(anyhow!("Event writer task failed: {err}")),
        }
    } else {
        Ok(())
    }
}

pub fn shutdown_event_writer(rt: Handle) {
    if let Err(err) = rt.block_on(shutdown_writer()) {
        error!("Failed to shutdown event writer: {err:#}");
    }
}
