use crate::config::Config;
use anyhow::{Context, Result, bail};
use std::sync::Arc;
use tracing::{error, info};

mod args;
mod config;
mod database;
mod server;

fn global_init(config: &Config) -> Result<()> {
    elog::init_log(&config.log)?;

    Ok(())
}

fn report_service_exit(
    service: &str,
    result: std::result::Result<Result<()>, tokio::task::JoinError>,
) -> Result<()> {
    match result {
        Ok(Ok(())) => anyhow::bail!("{} service stopped unexpectedly", service),
        Ok(Err(err)) => Err(err.context(format!("{} service failed", service))),
        Err(err) => Err(err).context(format!("{} service task panicked", service)),
    }
}

async fn app_run(config: Config) -> Result<()> {
    // init database
    database::clickhouse::init_clickhouse_db(&config.clickhouse).await?;

    let shutdown = Arc::new(tokio::sync::Notify::new());
    let server_shutdown = shutdown.clone();

    let web_dist_dir = server::get_web_dist_dir()?;
    let listener = server::bind_server(&config.server.address).await?;

    let mut server_handle =
        tokio::spawn(
            async move { server::start_server(web_dist_dir, listener, server_shutdown).await },
        );

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("Received termination signal to exit");

            shutdown.notify_waiters();
            let _ = tokio::time::timeout(tokio::time::Duration::from_secs(5), server_handle).await;

            Ok(())
        }
        result = &mut server_handle => report_service_exit("Server", result),
    }
}

fn main() -> Result<()> {
    let config = config::config();
    global_init(config)?;

    let res = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(config.runtime.worker_threads)
        .enable_all()
        .build()
        .unwrap()
        .block_on(app_run(config.clone()));

    match res {
        Ok(()) => Ok(()),
        Err(err) => {
            error!("exit error: {}", err);
            bail!(err)
        }
    }
}
