use crate::config::{EveRedisCfg, EveRedisCmd};
use crate::source::event;
use ::redis::{RedisResult, TypedCommands};
use r2d2::Pool;
use std::{num::NonZeroUsize, sync::atomic::Ordering, thread, time::Duration};
use tracing::error;

pub fn redis_reader(cfg: EveRedisCfg, pool: Pool<::redis::Client>) {
    let mut conn = None;

    while crate::RUNNING.get().unwrap().load(Ordering::SeqCst) {
        if conn.is_none() {
            conn = match pool.get() {
                Ok(conn) => Some(conn),
                Err(err) => {
                    error!("Failed to get pool connection: {}", err.to_string());
                    thread::sleep(Duration::from_millis(1000));
                    continue;
                }
            };
        }

        let res: RedisResult<Vec<String>> = {
            let conn = conn.as_mut().expect("connection checked above");
            match cfg.cmd {
                EveRedisCmd::Rpop => conn.rpop(cfg.key.as_str(), NonZeroUsize::new(cfg.batch_size)),
                EveRedisCmd::Lpop => conn.lpop(cfg.key.as_str(), NonZeroUsize::new(cfg.batch_size)),
            }
        };

        match res {
            Ok(values) => {
                if values.is_empty() {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }
                for value in values {
                    if let Err(err) = event::process_eve(&value) {
                        error!("Failed to process eve: {}", err.to_string());
                    }
                }
            }
            Err(err) => {
                error!("Poll eve error: {}", err.to_string());
                conn = None;
                thread::sleep(Duration::from_millis(500));
            }
        }
    }
}
