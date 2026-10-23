use crate::alert::export::{AlertExportQuery, build_export_header, compute_export_stats};
use crate::alert::model::{AlertCategories, AlertOptionsQuery, AlertPage, AlertProtos, AlertQuery};
use crate::alert::service;
use crate::config;
use crate::server::error::ApiError;
use axum::Json;
use axum::body::{Body, Bytes};
use axum::extract::rejection::JsonRejection;
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode, header};
use axum::response::Response;
use futures_util::StreamExt;

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

pub async fn export_alerts(
    payload: Result<Json<AlertExportQuery>, JsonRejection>,
) -> Result<Response, ApiError> {
    let Json(mut query) = payload.map_err(ApiError::from)?;
    let (start_ts, end_ts) = query.resolve().map_err(ApiError::from)?;
    query.normalize().map_err(ApiError::from)?;

    let max_rows = config::config().export.max_rows;
    let total = service::count_export_alerts(start_ts, end_ts, &query.filters)
        .await
        .map_err(|err| {
            tracing::error!(error = %err, "failed to count alert export rows");
            ApiError::internal()
        })?;
    if total == 0 {
        return empty_export_response(max_rows);
    }

    let (exported, truncated) = compute_export_stats(total, max_rows);
    let header = Bytes::from(build_export_header(&query.fields, query.locale));
    let cursor = service::open_export_cursor(
        start_ts,
        end_ts,
        &query.filters,
        &query.fields,
        query.locale,
        max_rows,
    )
    .map_err(|err| {
        tracing::error!(error = %err, "failed to start alert export");
        ApiError::internal()
    })?;

    let header_stream =
        futures_util::stream::once(async move { Ok::<Bytes, std::io::Error>(header) });
    let row_stream = futures_util::stream::unfold(Some(cursor), |state| async move {
        let mut cursor = state?;

        match cursor.next().await {
            Ok(Some(bytes)) => Some((Ok::<Bytes, std::io::Error>(bytes), Some(cursor))),
            Ok(None) => None,
            Err(err) => {
                tracing::error!(error = %err, "failed to stream alert export");
                Some((Err(std::io::Error::other(err.to_string())), None))
            }
        }
    });

    let disposition = format!("attachment; filename=\"alerts-{start_ts}-{end_ts}.csv\"");
    let mut response = Response::new(Body::from_stream(header_stream.chain(row_stream)));
    let headers = response.headers_mut();

    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::try_from(disposition.as_str()).map_err(|_| ApiError::internal())?,
    );
    insert_export_common_headers(headers, total, exported, truncated, max_rows)?;

    Ok(response)
}

fn empty_export_response(max_rows: u64) -> Result<Response, ApiError> {
    let mut response = Response::new(Body::empty());
    *response.status_mut() = StatusCode::NO_CONTENT;
    insert_export_common_headers(response.headers_mut(), 0, 0, false, max_rows)?;

    Ok(response)
}

fn insert_export_common_headers(
    headers: &mut HeaderMap,
    total: u64,
    exported: u64,
    truncated: bool,
    max_rows: u64,
) -> Result<(), ApiError> {
    let total_value = total.to_string();
    let exported_value = exported.to_string();
    let max_rows_value = max_rows.to_string();

    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert(
        HeaderName::from_static("x-export-total"),
        HeaderValue::try_from(total_value.as_str()).map_err(|_| ApiError::internal())?,
    );
    headers.insert(
        HeaderName::from_static("x-export-exported"),
        HeaderValue::try_from(exported_value.as_str()).map_err(|_| ApiError::internal())?,
    );
    headers.insert(
        HeaderName::from_static("x-export-truncated"),
        HeaderValue::from_static(if truncated { "true" } else { "false" }),
    );
    headers.insert(
        HeaderName::from_static("x-export-max-rows"),
        HeaderValue::try_from(max_rows_value.as_str()).map_err(|_| ApiError::internal())?,
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    #[tokio::test]
    async fn empty_export_returns_204_without_csv_headers_or_body() {
        let response = empty_export_response(1_000_000).unwrap();

        assert_eq!(response.status(), StatusCode::NO_CONTENT);
        assert!(response.headers().get(header::CONTENT_TYPE).is_none());
        assert!(
            response
                .headers()
                .get(header::CONTENT_DISPOSITION)
                .is_none()
        );
        assert_eq!(
            response.headers().get(header::CACHE_CONTROL).unwrap(),
            "no-store"
        );
        assert_eq!(response.headers().get("x-export-total").unwrap(), "0");
        assert_eq!(response.headers().get("x-export-exported").unwrap(), "0");
        assert_eq!(
            response.headers().get("x-export-truncated").unwrap(),
            "false"
        );
        assert_eq!(
            response.headers().get("x-export-max-rows").unwrap(),
            "1000000"
        );

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        assert!(body.is_empty());
    }
}
