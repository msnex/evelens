use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use time::format_description::{FormatItem, well_known::Rfc3339};
use time::macros::format_description;

const EVE_TIMESTAMP_FORMAT: &[FormatItem<'static>] = format_description!(
    "[year]-[month]-[day]T[hour]:[minute]:[second]\
     [optional [.[subsecond]]]\
     [offset_hour sign:mandatory][offset_minute]"
);

/// EVE record following the schema in `docs/schemas/eve_*.md`
/// A field is an `Option<T>` if and only if the schema marks it as optional.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EveJsonSchema {
    pub timestamp: String,
    pub flow_id: Option<u64>,
    pub parent_id: Option<u64>,
    pub in_iface: Option<String>,
    pub event_type: String,
    pub vlan: Option<Vec<u16>>,
    pub src_ip: Option<String>,
    pub src_port: Option<u16>,
    pub dest_ip: Option<String>,
    pub dest_port: Option<u16>,
    pub proto: Option<String>,
    pub ip_v: Option<u8>,
    pub icmp_type: Option<u8>,
    pub icmp_code: Option<u8>,
    pub pkt_src: String,
    pub ether: Option<Ether>,
    pub tx_id: Option<u64>,
    pub host: Option<String>,
    pub alert: Option<Alert>,
    pub app_proto: Option<String>,
    pub http: Option<Http>,
    pub flow: Option<Flow>,
}

/// `ether.*` fields from the EVE header schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ether {
    pub src_mac: Option<String>,
    pub dest_mac: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub action: String,
    pub signature_id: u32,
    pub signature: String,
    pub category: String,
    pub severity: i32,
    pub rule: Option<String>,
    pub xff: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Http {
    pub http_method: Option<String>,
    pub url: Option<String>,
    pub protocol: Option<String>,
    pub status: Option<u16>,
    pub http_request_header: Option<String>,
    pub http_response_header: Option<String>,
    pub http_response_line: Option<String>,
    pub http_request_body: Option<String>,
    pub http_response_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow {
    pub pkts_toserver: u64,
    pub pkts_toclient: u64,
    pub bytes_toserver: u64,
    pub bytes_toclient: u64,
}

pub fn parse_eve_timestamp(value: &str) -> Result<OffsetDateTime, time::error::Parse> {
    OffsetDateTime::parse(value, &Rfc3339)
        .or_else(|_| OffsetDateTime::parse(value, EVE_TIMESTAMP_FORMAT))
}
