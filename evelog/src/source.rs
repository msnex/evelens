use crate::config::{Config, EveSource};
use anyhow::{Result, bail};
use std::thread::{self, JoinHandle};

mod event;
mod file;
mod redis;

pub fn spawn_source_reader(cfg: &Config) -> Result<Vec<JoinHandle<()>>> {
    match cfg.eve.source {
        EveSource::File => {
            let handle = thread::Builder::new()
                .name("file-reader".to_string())
                .spawn(|| todo!())?;
            Ok(vec![handle])
        }
        EveSource::Redis => {
            if let Some(redis_cfg) = cfg.eve.redis.as_ref() {
                let worker_threads = redis_cfg.worker_threads;
                if worker_threads == 0 {
                    bail!("eve.redis.worker_threads must be greater than 0");
                }

                let mut handles = Vec::new();

                let client = ::redis::Client::open(redis_cfg.url.clone())?;
                let pool = r2d2::Pool::builder()
                    .max_size(worker_threads * 2)
                    .min_idle(Some(worker_threads))
                    .build(client)?;

                for id in 0..worker_threads {
                    let reader_cfg = redis_cfg.clone();
                    let conn_pool = pool.clone();

                    let handle = thread::Builder::new()
                        .name(format!("reader-{}", id + 1))
                        .spawn(move || redis::redis_reader(reader_cfg, conn_pool))?;
                    handles.push(handle);
                }
                Ok(handles)
            } else {
                bail!("Redis configure missed");
            }
        }
    }
}
