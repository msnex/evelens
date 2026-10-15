use crate::args;
use anyhow::Result;
use serde::Deserialize;
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

#[derive(Debug, Clone, Deserialize)]
pub struct RuntimeCfg {
    pub worker_threads: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub runtime: RuntimeCfg,
    pub log: elog::LogCfg,
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
