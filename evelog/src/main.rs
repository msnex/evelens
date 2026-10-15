use anyhow::{Result, bail};
use std::time::Duration;
use tracing::{debug, info};

mod affinity;
mod args;
mod config;

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

fn main() -> Result<()> {
    let config = config::config();

    elog::init_log(&config.log)?;
    debug!("config: {:?}", config);

    let async_rt = init_async_runtime()?;

    async_rt.shutdown_timeout(Duration::from_secs(5));

    Ok(())
}
