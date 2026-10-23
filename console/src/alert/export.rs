use crate::alert::model::{
    AlertFilter, AlertQueryError, deserialize_opt_i64, normalize_filters, resolve_time_range,
};
use serde::Deserialize;
use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
pub enum ExportLocale {
    #[default]
    #[serde(rename = "zh-CN")]
    ZhCn,
    #[serde(rename = "en-US")]
    EnUs,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertExportField {
    Signature,
    Category,
    Severity,
    Action,
    Timestamp,
    SignatureId,
    Rule,
    Xff,
    SrcMac,
    SrcIp,
    SrcPort,
    DstMac,
    DstIp,
    DstPort,
    Vlan,
    Proto,
    AppProto,
    TsPkts,
    TsBytes,
    TcPkts,
    TcBytes,
    PktSrc,
    HttpMethod,
    HttpUrl,
    HttpProtocol,
    HttpStatus,
    HttpReqHdr,
    HttpReqBody,
    HttpRespLine,
    HttpRespHdr,
    HttpRespBody,
    InIface,
    Host,
    Id,
}

impl AlertExportField {
    pub fn label(self, locale: ExportLocale) -> &'static str {
        match (self, locale) {
            (Self::Signature, ExportLocale::ZhCn) => "告警名称",
            (Self::Signature, ExportLocale::EnUs) => "Signature",
            (Self::Category, ExportLocale::ZhCn) => "分类",
            (Self::Category, ExportLocale::EnUs) => "Category",
            (Self::Severity, ExportLocale::ZhCn) => "严重级别",
            (Self::Severity, ExportLocale::EnUs) => "Severity",
            (Self::Action, ExportLocale::ZhCn) => "动作",
            (Self::Action, ExportLocale::EnUs) => "Action",
            (Self::Timestamp, ExportLocale::ZhCn) => "产生时间 (UTC)",
            (Self::Timestamp, ExportLocale::EnUs) => "Timestamp (UTC)",
            (Self::SignatureId, ExportLocale::ZhCn) => "规则 ID",
            (Self::SignatureId, ExportLocale::EnUs) => "Signature ID",
            (Self::Rule, ExportLocale::ZhCn) => "规则",
            (Self::Rule, ExportLocale::EnUs) => "Rule",
            (Self::Xff, ExportLocale::ZhCn) => "X-Forwarded-For",
            (Self::Xff, ExportLocale::EnUs) => "X-Forwarded-For",
            (Self::SrcMac, ExportLocale::ZhCn) => "源 MAC",
            (Self::SrcMac, ExportLocale::EnUs) => "Source MAC",
            (Self::SrcIp, ExportLocale::ZhCn) => "源 IP",
            (Self::SrcIp, ExportLocale::EnUs) => "Source IP",
            (Self::SrcPort, ExportLocale::ZhCn) => "源端口",
            (Self::SrcPort, ExportLocale::EnUs) => "Source Port",
            (Self::DstMac, ExportLocale::ZhCn) => "目的 MAC",
            (Self::DstMac, ExportLocale::EnUs) => "Destination MAC",
            (Self::DstIp, ExportLocale::ZhCn) => "目的 IP",
            (Self::DstIp, ExportLocale::EnUs) => "Destination IP",
            (Self::DstPort, ExportLocale::ZhCn) => "目的端口",
            (Self::DstPort, ExportLocale::EnUs) => "Destination Port",
            (Self::Vlan, ExportLocale::ZhCn) => "VLAN",
            (Self::Vlan, ExportLocale::EnUs) => "VLAN",
            (Self::Proto, ExportLocale::ZhCn) => "协议",
            (Self::Proto, ExportLocale::EnUs) => "Protocol",
            (Self::AppProto, ExportLocale::ZhCn) => "应用协议",
            (Self::AppProto, ExportLocale::EnUs) => "App Protocol",
            (Self::TsPkts, ExportLocale::ZhCn) => "发送报文数",
            (Self::TsPkts, ExportLocale::EnUs) => "To-server Packets",
            (Self::TsBytes, ExportLocale::ZhCn) => "发送字节数",
            (Self::TsBytes, ExportLocale::EnUs) => "To-server Bytes",
            (Self::TcPkts, ExportLocale::ZhCn) => "响应报文数",
            (Self::TcPkts, ExportLocale::EnUs) => "To-client Packets",
            (Self::TcBytes, ExportLocale::ZhCn) => "响应字节数",
            (Self::TcBytes, ExportLocale::EnUs) => "To-client Bytes",
            (Self::PktSrc, ExportLocale::ZhCn) => "来源",
            (Self::PktSrc, ExportLocale::EnUs) => "Source",
            (Self::HttpMethod, ExportLocale::ZhCn) => "HTTP 请求方法",
            (Self::HttpMethod, ExportLocale::EnUs) => "HTTP Method",
            (Self::HttpUrl, ExportLocale::ZhCn) => "HTTP URL",
            (Self::HttpUrl, ExportLocale::EnUs) => "HTTP URL",
            (Self::HttpProtocol, ExportLocale::ZhCn) => "HTTP 协议",
            (Self::HttpProtocol, ExportLocale::EnUs) => "HTTP Protocol",
            (Self::HttpStatus, ExportLocale::ZhCn) => "HTTP 状态码",
            (Self::HttpStatus, ExportLocale::EnUs) => "HTTP Status",
            (Self::HttpReqHdr, ExportLocale::ZhCn) => "请求头",
            (Self::HttpReqHdr, ExportLocale::EnUs) => "Request Headers",
            (Self::HttpReqBody, ExportLocale::ZhCn) => "请求体",
            (Self::HttpReqBody, ExportLocale::EnUs) => "Request Body",
            (Self::HttpRespLine, ExportLocale::ZhCn) => "状态行",
            (Self::HttpRespLine, ExportLocale::EnUs) => "Status Line",
            (Self::HttpRespHdr, ExportLocale::ZhCn) => "响应头",
            (Self::HttpRespHdr, ExportLocale::EnUs) => "Response Headers",
            (Self::HttpRespBody, ExportLocale::ZhCn) => "响应体",
            (Self::HttpRespBody, ExportLocale::EnUs) => "Response Body",
            (Self::InIface, ExportLocale::ZhCn) => "镜像网卡",
            (Self::InIface, ExportLocale::EnUs) => "Capture Interface",
            (Self::Host, ExportLocale::ZhCn) => "探针 Host",
            (Self::Host, ExportLocale::EnUs) => "Suricata Host",
            (Self::Id, ExportLocale::ZhCn) => "ID",
            (Self::Id, ExportLocale::EnUs) => "ID",
        }
    }

    pub fn sql_expression(self, locale: ExportLocale) -> &'static str {
        match self {
            Self::Severity => match locale {
                ExportLocale::ZhCn => {
                    "multiIf(severity = 1, '高', severity = 2, '中', severity = 3, '低', severity = 4, '信息', '未知')"
                }
                ExportLocale::EnUs => {
                    "multiIf(severity = 1, 'High', severity = 2, 'Medium', severity = 3, 'Low', severity = 4, 'Info', 'Unknown')"
                }
            },
            Self::Vlan => "arrayStringConcat(arrayMap(x -> toString(x), vlan), ', ')",
            Self::Id => "toString(id)",
            _ => self.column(),
        }
    }

    fn column(self) -> &'static str {
        match self {
            Self::Signature => "signature",
            Self::Category => "category",
            Self::Severity => unreachable!("severity uses a computed expression"),
            Self::Action => "action",
            Self::Timestamp => "timestamp",
            Self::SignatureId => "signature_id",
            Self::Rule => "rule",
            Self::Xff => "xff",
            Self::SrcMac => "src_mac",
            Self::SrcIp => "src_ip",
            Self::SrcPort => "src_port",
            Self::DstMac => "dst_mac",
            Self::DstIp => "dst_ip",
            Self::DstPort => "dst_port",
            Self::Vlan => unreachable!("vlan uses a computed expression"),
            Self::Proto => "proto",
            Self::AppProto => "app_proto",
            Self::TsPkts => "ts_pkts",
            Self::TsBytes => "ts_bytes",
            Self::TcPkts => "tc_pkts",
            Self::TcBytes => "tc_bytes",
            Self::PktSrc => "pkt_src",
            Self::HttpMethod => "http_method",
            Self::HttpUrl => "http_url",
            Self::HttpProtocol => "http_protocol",
            Self::HttpStatus => "http_status",
            Self::HttpReqHdr => "http_req_hdr",
            Self::HttpReqBody => "http_req_body",
            Self::HttpRespLine => "http_resp_line",
            Self::HttpRespHdr => "http_resp_hdr",
            Self::HttpRespBody => "http_resp_body",
            Self::InIface => "in_iface",
            Self::Host => "host",
            Self::Id => unreachable!("id uses a computed expression"),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AlertExportQuery {
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub start_ts: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub end_ts: Option<i64>,
    #[serde(default)]
    pub filters: Vec<AlertFilter>,
    #[serde(default)]
    pub fields: Vec<AlertExportField>,
    #[serde(default)]
    pub locale: ExportLocale,
}

impl AlertExportQuery {
    pub fn resolve(&self) -> Result<(i64, i64), AlertQueryError> {
        resolve_time_range(self.start_ts, self.end_ts)
    }

    pub fn normalize(&mut self) -> Result<(), AlertQueryError> {
        normalize_filters(&mut self.filters)?;

        if self.fields.is_empty() {
            return Err(AlertQueryError::ExportFields);
        }

        let mut seen = HashSet::with_capacity(self.fields.len());
        self.fields.retain(|field| seen.insert(*field));

        Ok(())
    }
}

pub fn build_export_select(fields: &[AlertExportField], locale: ExportLocale) -> String {
    fields
        .iter()
        .map(|field| field.sql_expression(locale))
        .collect::<Vec<_>>()
        .join(", ")
}

pub fn build_export_header(fields: &[AlertExportField], locale: ExportLocale) -> String {
    let header = fields
        .iter()
        .map(|field| escape_csv_header(field.label(locale)))
        .collect::<Vec<_>>()
        .join(",");

    format!("\u{feff}{header}\n")
}

pub fn compute_export_stats(total: u64, max_rows: u64) -> (u64, bool) {
    if max_rows == 0 {
        (total, false)
    } else {
        (total.min(max_rows), total > max_rows)
    }
}

fn escape_csv_header(value: &str) -> String {
    if value.contains(&[',', '"', '\n', '\r'][..]) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alert::model::{AlertFilterField, AlertFilterOperator};

    #[test]
    fn export_field_keys_deserialize_and_unknown_fields_fail() {
        let fields: Vec<AlertExportField> =
            serde_json::from_str(r#"["signature","http_status","timestamp"]"#).unwrap();

        assert_eq!(
            fields,
            vec![
                AlertExportField::Signature,
                AlertExportField::HttpStatus,
                AlertExportField::Timestamp
            ]
        );

        assert!(serde_json::from_str::<AlertExportField>(r#""unknown""#).is_err());
    }

    #[test]
    fn normalize_rejects_empty_fields_and_deduplicates() {
        let mut empty = AlertExportQuery {
            start_ts: Some(0),
            end_ts: Some(1),
            filters: Vec::new(),
            fields: Vec::new(),
            locale: ExportLocale::ZhCn,
        };
        assert_eq!(empty.normalize(), Err(AlertQueryError::ExportFields));

        let mut query = AlertExportQuery {
            start_ts: Some(0),
            end_ts: Some(1),
            filters: Vec::new(),
            fields: vec![
                AlertExportField::Signature,
                AlertExportField::SrcIp,
                AlertExportField::Signature,
            ],
            locale: ExportLocale::ZhCn,
        };
        query.normalize().unwrap();
        assert_eq!(
            query.fields,
            vec![AlertExportField::Signature, AlertExportField::SrcIp]
        );
    }

    #[test]
    fn normalize_reuses_alert_filter_validation() {
        let mut query = AlertExportQuery {
            start_ts: Some(0),
            end_ts: Some(1),
            filters: vec![AlertFilter {
                field: AlertFilterField::SrcPort,
                operator: AlertFilterOperator::Eq,
                values: vec!["not-a-port".to_string()],
            }],
            fields: vec![AlertExportField::Signature],
            locale: ExportLocale::ZhCn,
        };

        assert_eq!(query.normalize(), Err(AlertQueryError::FilterValue));
    }

    #[test]
    fn export_select_maps_columns_and_transforms() {
        let fields = [
            AlertExportField::Signature,
            AlertExportField::Severity,
            AlertExportField::Vlan,
            AlertExportField::Id,
            AlertExportField::HttpReqHdr,
        ];

        assert_eq!(
            build_export_select(&fields, ExportLocale::ZhCn),
            "signature, multiIf(severity = 1, '高', severity = 2, '中', severity = 3, '低', severity = 4, '信息', '未知'), arrayStringConcat(arrayMap(x -> toString(x), vlan), ', '), toString(id), http_req_hdr"
        );
        assert!(build_export_select(&fields, ExportLocale::EnUs).contains("'High'"));
    }

    #[test]
    fn export_header_has_bom_and_localized_labels() {
        let fields = [
            AlertExportField::Signature,
            AlertExportField::Severity,
            AlertExportField::Timestamp,
        ];

        assert_eq!(
            build_export_header(&fields, ExportLocale::ZhCn),
            "\u{feff}告警名称,严重级别,产生时间 (UTC)\n"
        );
        assert_eq!(
            build_export_header(&fields, ExportLocale::EnUs),
            "\u{feff}Signature,Severity,Timestamp (UTC)\n"
        );
    }

    #[test]
    fn export_header_escapes_special_characters() {
        assert_eq!(escape_csv_header("a,b"), "\"a,b\"");
        assert_eq!(escape_csv_header("a\"b"), "\"a\"\"b\"");
        assert_eq!(escape_csv_header("a\nb"), "\"a\nb\"");
    }

    #[test]
    fn export_stats_respect_limit() {
        assert_eq!(compute_export_stats(10, 0), (10, false));
        assert_eq!(compute_export_stats(10, 10), (10, false));
        assert_eq!(compute_export_stats(10, 3), (3, true));
        assert_eq!(compute_export_stats(0, 3), (0, false));
    }
}
