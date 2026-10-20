use anyhow::{Result, bail};
use axum::Router;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::services::ServeDir;
use tracing::{error, info};

mod routes;

pub fn get_web_dist_dir() -> Result<String> {
    if let Ok(dir) = std::env::var("WEB_DIST_DIR") {
        return Ok(dir);
    }

    if let Ok(exe_path) = std::env::current_exe()
        && let Some(exe_dir) = exe_path.parent()
    {
        if let Some(parent_dir) = exe_dir.parent() {
            let dist_path = parent_dir.join("web").join("dist");
            if dist_path.exists() {
                return Ok(dist_path.to_string_lossy().to_string());
            }
        }

        let mut workspace_dir = exe_dir.to_path_buf();
        if workspace_dir.pop() && workspace_dir.pop() {
            let dist_path = workspace_dir.join("web").join("dist");
            if dist_path.exists() {
                return Ok(dist_path.to_string_lossy().to_string());
            }
        }
    }

    bail!("Web dist files are not found")
}

pub async fn bind_server(address: &str) -> Result<TcpListener> {
    let addr: SocketAddr = address.parse()?;
    let listener = TcpListener::bind(addr).await?;

    info!("Server is listening on: http://{}", address);

    Ok(listener)
}

pub async fn start_server(
    dist_dir: String,
    listener: TcpListener,
    shutdown: Arc<tokio::sync::Notify>,
) -> Result<()> {
    let static_service = ServeDir::new(&dist_dir);
    let app = Router::new().fallback_service(static_service);

    info!("Serving dist files from: {}", dist_dir);

    let serve = axum::serve(listener, app);
    let graceful = serve.with_graceful_shutdown(async move {
        shutdown.notified().await;
    });
    match graceful.await {
        Ok(()) => {
            info!("Server has been shutdown");
            Ok(())
        }
        Err(err) => {
            error!("Failed to shutdown Server: {}", err.to_string());
            bail!("Failed to shutdown Server: {}", err)
        }
    }
}
