use super::error;
use super::handler::alert;
use axum::Router;
use axum::routing::post;

pub fn router() -> Router {
    Router::new().nest("/api", api_router())
}

fn api_router() -> Router {
    Router::new()
        .route("/v1/alerts", post(alert::get_alerts))
        .route("/v1/alerts/protos", post(alert::get_alert_protos))
        .route("/v1/alerts/categories", post(alert::get_alert_categories))
        .fallback(error::not_found)
        .method_not_allowed_fallback(error::method_not_allowed)
}
