use axum::Json;
use axum::Router;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;

#[allow(dead_code)]
async fn status(_headers: HeaderMap) -> Result<Response, StatusCode> {
    Ok(Json("").into_response())
}

#[allow(dead_code)]
pub fn routes() -> Router {
    Router::new().route("/", get(status))
}
