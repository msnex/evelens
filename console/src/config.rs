use crate::args;
use anyhow::Result;
use serde::Deserialize;
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

#[derive(Debug, Clone, Deserialize)]
pub struct ServerCfg {
    pub address: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ClickhouseCfg {
    pub url: String,
    pub database: String,
    pub user: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RuntimeCfg {
    pub worker_threads: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportCfg {
    #[serde(default = "default_export_max_rows")]
    pub max_rows: u64,
}

fn default_export_max_rows() -> u64 {
    1_000_000
}

impl Default for ExportCfg {
    fn default() -> Self {
        Self {
            max_rows: default_export_max_rows(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub log: elog::LogCfg,
    pub runtime: RuntimeCfg,
    pub clickhouse: ClickhouseCfg,
    pub server: ServerCfg,
    #[serde(default)]
    pub export: ExportCfg,
}

impl Config {
    pub fn new(path: &str) -> Result<Self> {
        let cfg = config::Config::builder()
            .add_source(config::File::with_name(path).required(true))
            .add_source(
                config::Environment::with_prefix("CONSOLE")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_config_defaults_to_one_million_rows() {
        assert_eq!(ExportCfg::default().max_rows, 1_000_000);
    }
}
