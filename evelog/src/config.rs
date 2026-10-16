use crate::args;
use anyhow::Result;
use serde::Deserialize;
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

fn default_clickhouse_batch_size() -> usize {
    10_000
}

fn default_clickhouse_flush_interval_ms() -> u64 {
    1_000
}

#[derive(Debug, Clone, Deserialize)]
pub struct RuntimeCfg {
    pub worker_threads: usize,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct EveFileCfg {
    pub filename: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EveRedisCmd {
    Rpop,
    Lpop,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EveRedisCfg {
    pub url: String,
    pub key: String,
    pub cmd: EveRedisCmd,
    pub batch_size: usize,
    pub worker_threads: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EveSource {
    Redis,
    File,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EveCfg {
    pub source: EveSource,
    pub redis: Option<EveRedisCfg>,
    #[allow(dead_code)]
    pub file: Option<EveFileCfg>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ClickhouseCfg {
    pub url: String,
    pub database: String,
    pub user: String,
    pub password: String,
    #[serde(default = "default_clickhouse_batch_size")]
    pub batch_size: usize,
    #[serde(default = "default_clickhouse_flush_interval_ms")]
    pub flush_interval_ms: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub runtime: RuntimeCfg,
    pub log: elog::LogCfg,
    pub eve: EveCfg,
    pub clickhouse: ClickhouseCfg,
}

impl Config {
    pub fn new(path: &str) -> Result<Self> {
        let cfg = config::Config::builder()
            .add_source(config::File::with_name(path).required(true))
            .add_source(
                config::Environment::with_prefix("EVELOG")
                    .prefix_separator("_")
                    .separator("__"),
            )
            .build()?;
        Ok(cfg.try_deserialize()?)
    }
}

#[inline(always)]
pub fn config() -> &'static Config {
    CONFIG.get_or_init(|| {
        let cfg = Config::new(&args::args().config);
        if let Err(err) = cfg {
            panic!("Failed to parse config: {}", err);
        }
        cfg.unwrap()
    })
}
