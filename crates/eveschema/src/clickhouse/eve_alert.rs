use crate::eve::{EveJsonSchema, parse_eve_timestamp};
use crate::util::clickhouse_uuid;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

pub const TX_ID_MISSING: u64 = u64::MAX;

pub const EVE_ALERT_SCHEMA_CREATE_SQL: &str = concat!(
    "CREATE TABLE IF NOT EXISTS eve_alert_log (",
    " id UUID,",
    " timestamp DateTime64(6, 'UTC'),",
    " flow_id UInt64 DEFAULT 0,",
    " in_iface LowCardinality(String) DEFAULT '',",
    " host LowCardinality(String) DEFAULT '',",
    " src_mac String DEFAULT '',",
    " dst_mac String DEFAULT '',",
    " vlan Array(UInt16) DEFAULT [],",
    " src_ip String DEFAULT '',",
    " src_port UInt16 DEFAULT 0,",
    " dst_ip String DEFAULT '',",
    " dst_port UInt16 DEFAULT 0,",
    " proto LowCardinality(String) DEFAULT '',",
    " icmp_type UInt8 DEFAULT 0,",
    " icmp_code UInt8 DEFAULT 0,",
    " pkt_src LowCardinality(String) DEFAULT '',",
    " tx_id UInt64 DEFAULT 18446744073709551615,",
    " app_proto LowCardinality(String) DEFAULT '',",
    " action LowCardinality(String) DEFAULT '',",
    " signature_id UInt32 DEFAULT 0,",
    " signature String DEFAULT '',",
    " category LowCardinality(String) DEFAULT '',",
    " severity Int32 DEFAULT 0,",
    " rule String DEFAULT '',",
    " xff String DEFAULT '',",
    " http_method LowCardinality(String) DEFAULT '',",
    " http_url String DEFAULT '',",
    " http_protocol LowCardinality(String) DEFAULT '',",
    " http_status UInt16 DEFAULT 0,",
    " http_req_hdr String DEFAULT '',",
    " http_resp_hdr String DEFAULT '',",
    " http_req_body String DEFAULT '',",
    " http_resp_body String DEFAULT '',",
    " http_resp_line String DEFAULT '',",
    " ts_pkts UInt64 DEFAULT 0,",
    " tc_pkts UInt64 DEFAULT 0,",
    " ts_bytes UInt64 DEFAULT 0,",
    " tc_bytes UInt64 DEFAULT 0,",
    " INDEX idx_proto proto TYPE set(16) GRANULARITY 4,",
    " INDEX idx_app_proto app_proto TYPE set(128) GRANULARITY 4,",
    " INDEX idx_src_ip src_ip TYPE bloom_filter(0.01) GRANULARITY 4,",
    " INDEX idx_src_port src_port TYPE bloom_filter(0.01) GRANULARITY 4,",
    " INDEX idx_dst_ip dst_ip TYPE bloom_filter(0.01) GRANULARITY 4,",
    " INDEX idx_dst_port dst_port TYPE bloom_filter(0.01) GRANULARITY 4,",
    " INDEX idx_signature signature TYPE text(tokenizer = ngrams(3)) GRANULARITY 1,",
    " INDEX idx_category category TYPE set(256) GRANULARITY 4",
    ") ENGINE = MergeTree() ",
    "PARTITION BY toStartOfMonth(timestamp) ",
    "ORDER BY (timestamp, proto, app_proto) ",
    "TTL toDateTime(timestamp) + INTERVAL 180 DAY DELETE",
);

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct EveAlertSchema {
    #[serde(with = "clickhouse_uuid")]
    pub id: Uuid,
    #[serde(with = "clickhouse::serde::time::datetime64::micros")]
    pub timestamp: OffsetDateTime,
    pub flow_id: u64,
    pub in_iface: String,
    pub host: String,
    pub src_mac: String,
    pub dst_mac: String,
    pub vlan: Vec<u16>,
    pub src_ip: String,
    pub src_port: u16,
    pub dst_ip: String,
    pub dst_port: u16,
    pub proto: String,
    pub icmp_type: u8,
    pub icmp_code: u8,
    pub pkt_src: String,
    pub tx_id: u64,
    pub app_proto: String,
    pub action: String,
    pub signature_id: u32,
    pub signature: String,
    pub category: String,
    pub severity: i32,
    pub rule: String,
    pub xff: String,
    pub http_method: String,
    pub http_url: String,
    pub http_protocol: String,
    pub http_status: u16,
    pub http_req_hdr: String,
    pub http_resp_hdr: String,
    pub http_req_body: String,
    pub http_resp_body: String,
    pub http_resp_line: String,
    pub ts_pkts: u64,
    pub tc_pkts: u64,
    pub ts_bytes: u64,
    pub tc_bytes: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum EveAlertSchemaError {
    #[error("invalid EVE timestamp: {0}")]
    InvalidTimestamp(time::error::Parse),
}

impl TryFrom<EveJsonSchema> for EveAlertSchema {
    type Error = EveAlertSchemaError;

    fn try_from(eve: EveJsonSchema) -> Result<Self, Self::Error> {
        let timestamp =
            parse_eve_timestamp(&eve.timestamp).map_err(EveAlertSchemaError::InvalidTimestamp)?;

        let EveJsonSchema {
            flow_id,
            in_iface,
            vlan,
            src_ip,
            src_port,
            dest_ip,
            dest_port,
            proto,
            icmp_type,
            icmp_code,
            pkt_src,
            ether,
            tx_id,
            host,
            alert,
            app_proto,
            http,
            flow,
            ..
        } = eve;

        let (src_mac, dst_mac) = match ether {
            Some(ether) => (
                ether.src_mac.unwrap_or_default(),
                ether.dest_mac.unwrap_or_default(),
            ),
            None => (String::new(), String::new()),
        };

        let (action, signature_id, signature, category, severity, rule, xff) = match alert {
            Some(alert) => (
                alert.action,
                alert.signature_id,
                alert.signature,
                alert.category,
                alert.severity,
                alert.rule.unwrap_or_default(),
                alert.xff.unwrap_or_default(),
            ),
            None => (
                String::new(),
                0,
                String::new(),
                String::new(),
                0,
                String::new(),
                String::new(),
            ),
        };

        let (
            http_method,
            http_url,
            http_protocol,
            http_status,
            http_req_hdr,
            http_resp_hdr,
            http_req_body,
            http_resp_body,
            http_resp_line,
        ) = match http {
            Some(http) => (
                http.http_method.unwrap_or_default(),
                http.url.unwrap_or_default(),
                http.protocol.unwrap_or_default(),
                http.status.unwrap_or_default(),
                http.http_request_header.unwrap_or_default(),
                http.http_response_header.unwrap_or_default(),
                http.http_request_body.unwrap_or_default(),
                http.http_response_body.unwrap_or_default(),
                http.http_response_line.unwrap_or_default(),
            ),
            None => (
                String::new(),
                String::new(),
                String::new(),
                0,
                String::new(),
                String::new(),
                String::new(),
                String::new(),
                String::new(),
            ),
        };

        let (ts_pkts, tc_pkts, ts_bytes, tc_bytes) = match flow {
            Some(flow) => (
                flow.pkts_toserver,
                flow.pkts_toclient,
                flow.bytes_toserver,
                flow.bytes_toclient,
            ),
            None => (0, 0, 0, 0),
        };

        Ok(Self {
            id: Uuid::now_v7(),
            timestamp,
            flow_id: flow_id.unwrap_or(0),
            in_iface: in_iface.unwrap_or_default(),
            host: host.unwrap_or_default(),
            src_mac,
            dst_mac,
            vlan: vlan.unwrap_or_default(),
            src_ip: src_ip.unwrap_or_default(),
            src_port: src_port.unwrap_or(0),
            dst_ip: dest_ip.unwrap_or_default(),
            dst_port: dest_port.unwrap_or(0),
            proto: proto.unwrap_or_default(),
            icmp_type: icmp_type.unwrap_or(0),
            icmp_code: icmp_code.unwrap_or(0),
            pkt_src,
            tx_id: tx_id.unwrap_or(TX_ID_MISSING),
            app_proto: app_proto.unwrap_or_default(),
            action,
            signature_id,
            signature,
            category,
            severity,
            rule,
            xff,
            http_method,
            http_url,
            http_protocol,
            http_status,
            http_req_hdr,
            http_resp_hdr,
            http_req_body,
            http_resp_body,
            http_resp_line,
            ts_pkts,
            tc_pkts,
            ts_bytes,
            tc_bytes,
        })
    }
}

pub fn is_tx_id_missing(value: &u64) -> bool {
    *value == TX_ID_MISSING
}
