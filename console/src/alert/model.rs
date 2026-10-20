use crate::alert::service::now_ms;
use eveschema::clickhouse::eve_alert::is_tx_id_missing;
use eveschema::util::{i64_as_string, is_zero_u8, u64_as_string};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::net::IpAddr;

const DEFAULT_PAGE: u32 = 1;
const DEFAULT_PAGE_SIZE: u32 = 20;
const MAX_PAGE_SIZE: u32 = 200;
const DEFAULT_RANGE_MS: i64 = 24 * 60 * 60 * 1000;
pub const MAX_FILTERS: usize = 16;

#[derive(Debug, Clone, Deserialize)]
pub struct AlertQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub start_ts: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub end_ts: Option<i64>,
    #[serde(default)]
    pub filters: Vec<AlertFilter>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct AlertFilter {
    pub field: AlertFilterField,
    pub operator: AlertFilterOperator,
    pub values: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertFilterField {
    Signature,
    Category,
    SrcIp,
    DstIp,
    SrcPort,
    DstPort,
    Proto,
    AppProto,
}

impl AlertFilterField {
    pub fn column(self) -> &'static str {
        match self {
            Self::Signature => "signature",
            Self::Category => "category",
            Self::SrcIp => "src_ip",
            Self::DstIp => "dst_ip",
            Self::SrcPort => "src_port",
            Self::DstPort => "dst_port",
            Self::Proto => "proto",
            Self::AppProto => "app_proto",
        }
    }

    pub fn is_port(self) -> bool {
        matches!(self, Self::SrcPort | Self::DstPort)
    }

    pub fn is_ip(self) -> bool {
        matches!(self, Self::SrcIp | Self::DstIp)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertFilterOperator {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    In,
    NotIn,
    Match,
    NotMatch,
}

impl AlertFilterOperator {
    pub fn is_multi(self) -> bool {
        matches!(self, Self::In | Self::NotIn)
    }

    pub fn is_allowed_for(self, field: AlertFilterField) -> bool {
        match self {
            Self::Eq | Self::Ne => true,
            Self::Gt | Self::Gte | Self::Lt | Self::Lte => field.is_port(),
            Self::In | Self::NotIn => !matches!(field, AlertFilterField::Signature),
            Self::Match | Self::NotMatch => matches!(field, AlertFilterField::Signature),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AlertOptionsQuery {
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub start_ts: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_opt_i64")]
    pub end_ts: Option<i64>,
}

impl AlertOptionsQuery {
    pub fn resolve(&self) -> Result<Option<(i64, i64)>, AlertQueryError> {
        match (self.start_ts, self.end_ts) {
            (None, None) => Ok(None),
            (Some(start_ts), Some(end_ts)) if start_ts <= end_ts => Ok(Some((start_ts, end_ts))),
            _ => Err(AlertQueryError::TimeRange),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AlertQueryError {
    Page,
    PageSize,
    TimeRange,
    FilterOperator,
    FilterValue,
    FilterCount,
}

impl AlertQuery {
    pub fn resolve(&self) -> Result<(u32, u32, i64, i64), AlertQueryError> {
        let page = self.page.unwrap_or(DEFAULT_PAGE);
        if page == 0 {
            return Err(AlertQueryError::Page);
        }

        let page_size = self.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
        if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
            return Err(AlertQueryError::PageSize);
        }

        let end_ts = self.end_ts.unwrap_or(now_ms());
        let start_ts = self
            .start_ts
            .unwrap_or_else(|| end_ts.saturating_sub(DEFAULT_RANGE_MS));
        if start_ts > end_ts {
            return Err(AlertQueryError::TimeRange);
        }

        Ok((page, page_size, start_ts, end_ts))
    }

    pub fn normalize_filters(&mut self) -> Result<(), AlertQueryError> {
        if self.filters.len() > MAX_FILTERS {
            return Err(AlertQueryError::FilterCount);
        }

        for filter in &mut self.filters {
            if !filter.operator.is_allowed_for(filter.field) {
                return Err(AlertQueryError::FilterOperator);
            }

            let mut values = Vec::with_capacity(filter.values.len());
            for raw in &filter.values {
                let value = raw.trim();
                if value.is_empty() {
                    return Err(AlertQueryError::FilterValue);
                }

                let value = if filter.field.is_ip() {
                    value
                        .parse::<IpAddr>()
                        .map(|ip| ip.to_string())
                        .map_err(|_| AlertQueryError::FilterValue)?
                } else if filter.field.is_port() {
                    value
                        .parse::<u16>()
                        .map(|port| port.to_string())
                        .map_err(|_| AlertQueryError::FilterValue)?
                } else {
                    value.to_string()
                };

                if !values.contains(&value) {
                    values.push(value);
                }
            }

            if filter.operator.is_multi() {
                if values.is_empty() {
                    return Err(AlertQueryError::FilterValue);
                }
            } else if values.len() != 1 {
                return Err(AlertQueryError::FilterValue);
            }

            filter.values = values;
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AlertPage {
    #[serde(with = "u64_as_string")]
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
    pub items: Vec<AlertRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct AlertProtos {
    pub proto: Vec<String>,
    pub app_proto: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct AlertCategories {
    pub category: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct AlertRow {
    pub id: String,
    #[serde(with = "i64_as_string")]
    pub timestamp: i64,
    #[serde(with = "u64_as_string")]
    pub flow_id: u64,
    pub in_iface: String,
    pub host: String,
    pub src_mac: String,
    pub dst_mac: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub vlan: Vec<u16>,
    pub src_ip: String,
    pub src_port: u16,
    pub dst_ip: String,
    pub dst_port: u16,
    pub proto: String,
    #[serde(skip_serializing_if = "is_zero_u8")]
    pub icmp_type: u8,
    #[serde(skip_serializing_if = "is_zero_u8")]
    pub icmp_code: u8,
    pub pkt_src: String,
    #[serde(with = "u64_as_string", skip_serializing_if = "is_tx_id_missing")]
    pub tx_id: u64,
    pub app_proto: String,
    pub action: String,
    pub signature_id: u32,
    pub signature: String,
    pub category: String,
    pub severity: Severity,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub rule: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub xff: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_method: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_protocol: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_req_hdr: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_resp_hdr: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_req_body: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub http_resp_body: String,
    #[serde(with = "u64_as_string")]
    pub ts_pkts: u64,
    #[serde(with = "u64_as_string")]
    pub tc_pkts: u64,
    #[serde(with = "u64_as_string")]
    pub ts_bytes: u64,
    #[serde(with = "u64_as_string")]
    pub tc_bytes: u64,
}

fn deserialize_opt_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum NumOrStr {
        Num(i64),
        Str(String),
    }

    match Option::<NumOrStr>::deserialize(deserializer)? {
        Some(NumOrStr::Num(value)) => Ok(Some(value)),
        Some(NumOrStr::Str(value)) => {
            if value.is_empty() {
                Ok(None)
            } else {
                value
                    .parse::<i64>()
                    .map(Some)
                    .map_err(serde::de::Error::custom)
            }
        }
        None => Ok(None),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    High,
    Medium,
    Low,
    Info,
    Unknown,
}

impl Severity {
    fn from_i32(value: i32) -> Self {
        match value {
            1 => Self::High,
            2 => Self::Medium,
            3 => Self::Low,
            4 => Self::Info,
            _ => Self::Unknown,
        }
    }

    fn as_i32(self) -> i32 {
        match self {
            Self::High => 1,
            Self::Medium => 2,
            Self::Low => 3,
            Self::Info => 4,
            Self::Unknown => 0,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
            Self::Info => "info",
            Self::Unknown => "unknown",
        }
    }

    fn from_str(value: &str) -> Option<Self> {
        match value {
            "high" => Some(Self::High),
            "medium" => Some(Self::Medium),
            "low" => Some(Self::Low),
            "info" => Some(Self::Info),
            "unknown" => Some(Self::Unknown),
            _ => None,
        }
    }
}

impl Serialize for Severity {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(self.as_str())
        } else {
            self.as_i32().serialize(serializer)
        }
    }
}

impl<'de> Deserialize<'de> for Severity {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            let label = String::deserialize(deserializer)?;
            Self::from_str(&label).ok_or_else(|| serde::de::Error::custom("unknown severity label"))
        } else {
            Ok(Self::from_i32(i32::deserialize(deserializer)?))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn alert_page_serializes_total_as_string() {
        let page = AlertPage {
            total: u64::MAX,
            page: 1,
            page_size: 20,
            items: Vec::new(),
        };

        let value = serde_json::to_value(page).unwrap();

        assert_eq!(value["total"], json!(u64::MAX.to_string()));
        assert!(value["total"].is_string());
        assert!(!value["total"].is_number());
    }
}
