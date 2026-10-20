use crate::config::ClickhouseCfg;
use anyhow::{Result, anyhow};
use clickhouse::Client;
use std::sync::OnceLock;
use tracing::info;

static DB: OnceLock<Client> = OnceLock::new();

pub async fn init_clickhouse_db(cfg: &ClickhouseCfg) -> Result<()> {
    let client = Client::default()
        .with_url(&cfg.url)
        .with_database(&cfg.database)
        .with_user(&cfg.user)
        .with_password(&cfg.password)
        .with_setting("session_timezone", "UTC");

    DB.set(client)
        .map_err(|_| anyhow!("Failed to set DB connection"))?;

    info!("ClickHouse initialized at: {}/{}", cfg.url, cfg.database);

    Ok(())
}

#[allow(dead_code)]
pub fn get_clickhouse_client() -> Client {
    DB.get().expect("Database not initialized").clone()
}
