use crate::config::Config;
use anyhow::{Result, bail};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::JoinHandle;
use std::time::Duration;
use tracing::{error, info};

mod affinity;
mod args;
mod config;
mod database;
mod source;

pub static RUNNING: std::sync::OnceLock<AtomicBool> = std::sync::OnceLock::new();

fn join_thread(threads: Vec<JoinHandle<()>>) {
    threads.into_iter().for_each(|handle| {
        let thread_name = handle.thread().name().unwrap_or("unknown").to_string();
        if handle.join().is_err() {
            error!("Can't join thread: {}", thread_name);
        }
    });
}

fn init_async_runtime() -> Result<tokio::runtime::Runtime> {
    let cpu_cores = crate::affinity::get_cpu_cores();
    let worker_threads = config::config().runtime.worker_threads.min(cpu_cores);

    if worker_threads == 0 {
        bail!("runtime.worker_threads must be greater than 0");
    }

    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(worker_threads)
        .enable_all()
        .build()?;

    info!("async runtime worker threads: {}", worker_threads);

    Ok(rt)
}

fn init_ctrlc() -> Result<()> {
    let _ = RUNNING.set(AtomicBool::new(true));

    ctrlc::set_handler(move || {
        info!("Received termination signal to exit");
        let r = RUNNING.get();
        if let Some(r) = r {
            r.store(false, Ordering::SeqCst);
        } else {
            let _ = RUNNING.set(AtomicBool::new(false));
        }
    })?;

    Ok(())
}

fn global_init(config: &Config) -> Result<()> {
    elog::init_log(&config.log)?;
    init_ctrlc()?;

    Ok(())
}

fn main() -> Result<()> {
    let config = config::config();

    global_init(config)?;
    let async_rt = init_async_runtime()?;
    let async_handle = async_rt.handle();

    async_rt.block_on(database::clickhouse::init_clickhouse_db(&config.clickhouse))?;
    info!("ClickHouse initialized");

    let source_handles = match source::spawn_source_reader(config) {
        Ok(handles) => handles,
        Err(err) => {
            database::clickhouse::shutdown_event_writer(async_handle.clone());
            return Err(err);
        }
    };

    while RUNNING.get().unwrap().load(Ordering::SeqCst) {
        std::thread::sleep(Duration::from_millis(100));
    }

    join_thread(source_handles);

    database::clickhouse::shutdown_event_writer(async_handle.clone());
    async_rt.shutdown_timeout(Duration::from_secs(5));

    Ok(())
}
