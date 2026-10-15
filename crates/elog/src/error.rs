use thiserror::Error;

#[derive(Debug, Error)]
pub enum LogError {
    #[error("config missing: {0}")]
    CfgMissing(String),
    #[error("rolling file build error")]
    RollingFileBuildError(#[from] tracing_appender::rolling::InitError),
}
