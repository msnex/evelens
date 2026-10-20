use crate::alert::model::{AlertCategories, AlertOptionsQuery, AlertPage, AlertProtos, AlertQuery};
use crate::alert::service;
use crate::server::error::ApiError;
use axum::Json;
use axum::extract::rejection::JsonRejection;

pub async fn get_alert_protos(
    payload: Result<Json<AlertOptionsQuery>, JsonRejection>,
) -> Result<Json<AlertProtos>, ApiError> {
    let Json(query) = payload.map_err(ApiError::from)?;
    let range = query.resolve().map_err(ApiError::from)?;

    service::query_alert_protos(range)
        .await
        .map(Json)
        .map_err(|err| {
            tracing::error!(error = %err, "failed to query alert protos");
            ApiError::internal()
        })
}

pub async fn get_alert_categories(
    payload: Result<Json<AlertOptionsQuery>, JsonRejection>,
) -> Result<Json<AlertCategories>, ApiError> {
    let Json(query) = payload.map_err(ApiError::from)?;
    let range = query.resolve().map_err(ApiError::from)?;

    service::query_alert_categories(range)
        .await
        .map(Json)
        .map_err(|err| {
            tracing::error!(error = %err, "failed to query alert categories");
            ApiError::internal()
        })
}

pub async fn get_alerts(
    payload: Result<Json<AlertQuery>, JsonRejection>,
) -> Result<Json<AlertPage>, ApiError> {
    let Json(mut query) = payload.map_err(ApiError::from)?;
    let (page, page_size, start_ts, end_ts) = query.resolve().map_err(ApiError::from)?;
    query.normalize_filters().map_err(ApiError::from)?;

    service::query_alerts(page, page_size, start_ts, end_ts, &query.filters)
        .await
        .map(Json)
        .map_err(|err| {
            tracing::error!(error = %err, "failed to query alerts");
            ApiError::internal()
        })
}
