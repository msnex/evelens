use crate::alert::model::AlertQueryError;
use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

const CODE_INVALID_PAGE: &str = "4001";
const CODE_INVALID_PAGE_SIZE: &str = "4002";
const CODE_INVALID_TIME_RANGE: &str = "4003";
const CODE_INVALID_JSON: &str = "4004";
const CODE_INVALID_FILTER_OPERATOR: &str = "4005";
const CODE_INVALID_FILTER_VALUE: &str = "4006";
const CODE_INVALID_FILTER_COUNT: &str = "4007";
const CODE_PAYLOAD_TOO_LARGE: &str = "4131";
const CODE_UNSUPPORTED_MEDIA_TYPE: &str = "4151";
const CODE_INVALID_REQUEST_BODY: &str = "4221";
const CODE_NOT_FOUND: &str = "4041";
const CODE_METHOD_NOT_ALLOWED: &str = "4051";
const CODE_INTERNAL_ERROR: &str = "5001";

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
    field: Option<&'static str>,
}

impl ApiError {
    fn new(
        status: StatusCode,
        code: &'static str,
        message: &'static str,
        field: Option<&'static str>,
    ) -> Self {
        Self {
            status,
            code,
            message,
            field,
        }
    }

    fn invalid_page() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_PAGE,
            "page must be greater than 0",
            Some("page"),
        )
    }

    fn invalid_page_size() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_PAGE_SIZE,
            "page_size must be between 1 and 200",
            Some("page_size"),
        )
    }

    fn invalid_time_range() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_TIME_RANGE,
            "start_ts must be less than or equal to end_ts",
            Some("start_ts"),
        )
    }

    fn invalid_filter_operator() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_FILTER_OPERATOR,
            "operator is not supported for this field",
            Some("filters"),
        )
    }

    fn invalid_filter_value() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_FILTER_VALUE,
            "invalid filter values",
            Some("filters"),
        )
    }

    fn invalid_filter_count() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_FILTER_COUNT,
            "too many filter conditions",
            Some("filters"),
        )
    }

    fn invalid_json() -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            CODE_INVALID_JSON,
            "Invalid JSON body",
            None,
        )
    }

    fn payload_too_large() -> Self {
        Self::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            CODE_PAYLOAD_TOO_LARGE,
            "Request body too large",
            None,
        )
    }

    fn unsupported_media_type() -> Self {
        Self::new(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            CODE_UNSUPPORTED_MEDIA_TYPE,
            "Content-Type must be application/json",
            None,
        )
    }

    fn invalid_request_body() -> Self {
        Self::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            CODE_INVALID_REQUEST_BODY,
            "Invalid request body",
            None,
        )
    }

    fn invalid_request_body_with_status(status: StatusCode) -> Self {
        Self::new(
            status,
            CODE_INVALID_REQUEST_BODY,
            "Invalid request body",
            None,
        )
    }

    fn not_found() -> Self {
        Self::new(StatusCode::NOT_FOUND, CODE_NOT_FOUND, "Not found", None)
    }

    fn method_not_allowed() -> Self {
        Self::new(
            StatusCode::METHOD_NOT_ALLOWED,
            CODE_METHOD_NOT_ALLOWED,
            "Method not allowed",
            None,
        )
    }

    pub fn internal() -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            CODE_INTERNAL_ERROR,
            "Internal server error",
            None,
        )
    }
}

impl From<AlertQueryError> for ApiError {
    fn from(value: AlertQueryError) -> Self {
        match value {
            AlertQueryError::Page => Self::invalid_page(),
            AlertQueryError::PageSize => Self::invalid_page_size(),
            AlertQueryError::TimeRange => Self::invalid_time_range(),
            AlertQueryError::FilterOperator => Self::invalid_filter_operator(),
            AlertQueryError::FilterValue => Self::invalid_filter_value(),
            AlertQueryError::FilterCount => Self::invalid_filter_count(),
        }
    }
}

impl From<JsonRejection> for ApiError {
    fn from(rejection: JsonRejection) -> Self {
        let status = rejection.status();

        match rejection {
            JsonRejection::MissingJsonContentType(_) => Self::unsupported_media_type(),
            JsonRejection::JsonSyntaxError(_) => Self::invalid_json(),
            JsonRejection::JsonDataError(_) => Self::invalid_request_body(),
            JsonRejection::BytesRejection(inner) => {
                if inner.status() == StatusCode::PAYLOAD_TOO_LARGE {
                    Self::payload_too_large()
                } else {
                    Self::invalid_request_body_with_status(status)
                }
            }
            _ => Self::invalid_request_body_with_status(status),
        }
    }
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    code: &'static str,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    field: Option<&'static str>,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ErrorResponse {
            code: self.code,
            message: self.message,
            field: self.field,
        };

        (self.status, Json(body)).into_response()
    }
}

pub async fn not_found() -> ApiError {
    ApiError::not_found()
}

pub async fn method_not_allowed() -> ApiError {
    ApiError::method_not_allowed()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn query_errors_map_to_expected_codes() {
        let cases = [
            (
                AlertQueryError::Page,
                StatusCode::BAD_REQUEST,
                "4001",
                Some("page"),
            ),
            (
                AlertQueryError::PageSize,
                StatusCode::BAD_REQUEST,
                "4002",
                Some("page_size"),
            ),
            (
                AlertQueryError::TimeRange,
                StatusCode::BAD_REQUEST,
                "4003",
                Some("start_ts"),
            ),
            (
                AlertQueryError::FilterOperator,
                StatusCode::BAD_REQUEST,
                "4005",
                Some("filters"),
            ),
            (
                AlertQueryError::FilterValue,
                StatusCode::BAD_REQUEST,
                "4006",
                Some("filters"),
            ),
            (
                AlertQueryError::FilterCount,
                StatusCode::BAD_REQUEST,
                "4007",
                Some("filters"),
            ),
        ];

        for (query_error, status, code, field) in cases {
            let error = ApiError::from(query_error);

            assert_eq!(error.status, status);
            assert_eq!(error.code, code);
            assert_eq!(error.field, field);
        }
    }

    #[test]
    fn all_error_codes_are_four_digits() {
        let codes = [
            CODE_INVALID_PAGE,
            CODE_INVALID_PAGE_SIZE,
            CODE_INVALID_TIME_RANGE,
            CODE_INVALID_JSON,
            CODE_INVALID_FILTER_OPERATOR,
            CODE_INVALID_FILTER_VALUE,
            CODE_INVALID_FILTER_COUNT,
            CODE_PAYLOAD_TOO_LARGE,
            CODE_UNSUPPORTED_MEDIA_TYPE,
            CODE_INVALID_REQUEST_BODY,
            CODE_NOT_FOUND,
            CODE_METHOD_NOT_ALLOWED,
            CODE_INTERNAL_ERROR,
        ];

        for code in codes {
            assert_eq!(code.len(), 4);
            assert!(code.bytes().all(|byte| byte.is_ascii_digit()));
        }
    }

    #[test]
    fn error_response_is_flat() {
        let error = ApiError::invalid_page_size();
        let value = serde_json::to_value(ErrorResponse {
            code: error.code,
            message: error.message,
            field: error.field,
        })
        .unwrap();

        assert_eq!(value["code"], json!("4002"));
        assert_eq!(
            value["message"],
            json!("page_size must be between 1 and 200")
        );
        assert_eq!(value["field"], json!("page_size"));
        assert!(value.get("error").is_none());
        assert!(value.get("success").is_none());
    }

    #[test]
    fn error_response_omits_missing_field() {
        let error = ApiError::internal();
        let value = serde_json::to_value(ErrorResponse {
            code: error.code,
            message: error.message,
            field: error.field,
        })
        .unwrap();

        assert_eq!(value["code"], json!("5001"));
        assert_eq!(value["message"], json!("Internal server error"));
        assert!(value.get("field").is_none());
    }
}
