use crate::alert::model::{
    AlertCategories, AlertFilter, AlertFilterOperator, AlertPage, AlertProtos, AlertRow,
};
use crate::database::clickhouse::get_clickhouse_client;
use anyhow::Result;
use clickhouse::query::Query;
use std::time::{SystemTime, UNIX_EPOCH};

const ALERT_TIME_FILTER: &str = "eve_alert_log.timestamp >= fromUnixTimestamp64Milli(?) AND eve_alert_log.timestamp <= fromUnixTimestamp64Milli(?)";

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|duration| i64::try_from(duration.as_millis()).ok())
        .unwrap_or(0)
}

pub async fn query_alert_protos(range: Option<(i64, i64)>) -> Result<AlertProtos> {
    let client = get_clickhouse_client();
    let where_clause = option_where_clause(range);
    let sql = format!(
        "SELECT \
         arraySort(groupUniqArrayIf(proto_value, proto_value != '')) AS proto, \
         arraySort(groupUniqArrayIf(app_proto_value, app_proto_value != '')) AS app_proto \
         FROM ( \
             SELECT proto AS proto_value, app_proto AS app_proto_value \
             FROM eve_alert_log{where_clause} \
         )"
    );
    let mut query = client.query(&sql);
    if let Some((start_ts, end_ts)) = range {
        query = query.bind(start_ts).bind(end_ts);
    }

    Ok(query.fetch_one::<AlertProtos>().await?)
}

pub async fn query_alert_categories(range: Option<(i64, i64)>) -> Result<AlertCategories> {
    let client = get_clickhouse_client();
    let where_clause = option_where_clause(range);
    let sql = format!(
        "SELECT \
         arraySort(groupUniqArrayIf(category_value, category_value != '')) AS category \
         FROM ( \
             SELECT category AS category_value \
             FROM eve_alert_log{where_clause} \
         )"
    );
    let mut query = client.query(&sql);
    if let Some((start_ts, end_ts)) = range {
        query = query.bind(start_ts).bind(end_ts);
    }

    Ok(query.fetch_one::<AlertCategories>().await?)
}

fn option_where_clause(range: Option<(i64, i64)>) -> String {
    if range.is_some() {
        format!(" WHERE {ALERT_TIME_FILTER}")
    } else {
        String::new()
    }
}

fn build_filter_clause(filters: &[AlertFilter]) -> String {
    filters
        .iter()
        .map(|filter| {
            let column = format!("eve_alert_log.{}", filter.field.column());
            match filter.operator {
                AlertFilterOperator::Eq => format!("{column} = ?"),
                AlertFilterOperator::Ne => format!("{column} != ?"),
                AlertFilterOperator::Gt => format!("{column} > ?"),
                AlertFilterOperator::Gte => format!("{column} >= ?"),
                AlertFilterOperator::Lt => format!("{column} < ?"),
                AlertFilterOperator::Lte => format!("{column} <= ?"),
                AlertFilterOperator::In => {
                    format!("{column} IN ({})", placeholders(filter.values.len()))
                }
                AlertFilterOperator::NotIn => {
                    format!("{column} NOT IN ({})", placeholders(filter.values.len()))
                }
                AlertFilterOperator::Match => {
                    format!("positionCaseInsensitiveUTF8({column}, ?) > 0")
                }
                AlertFilterOperator::NotMatch => {
                    format!("positionCaseInsensitiveUTF8({column}, ?) = 0")
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" AND ")
}

fn placeholders(count: usize) -> String {
    vec!["?"; count].join(", ")
}

fn bind_filter_values(mut query: Query, filters: &[AlertFilter]) -> Query {
    for filter in filters {
        for value in &filter.values {
            if filter.field.is_port() {
                query = query.bind(value.parse::<u16>().expect("port values are validated"));
            } else {
                query = query.bind(value.as_str());
            }
        }
    }

    query
}

pub async fn query_alerts(
    page: u32,
    page_size: u32,
    start_ts: i64,
    end_ts: i64,
    filters: &[AlertFilter],
) -> Result<AlertPage> {
    let client = get_clickhouse_client();
    let filter_clause = build_filter_clause(filters);
    let filter_sql = if filter_clause.is_empty() {
        String::new()
    } else {
        format!(" AND ({filter_clause})")
    };

    let count_sql =
        format!("SELECT count() FROM eve_alert_log WHERE {ALERT_TIME_FILTER}{filter_sql}");
    let count_query = bind_filter_values(
        client.query(&count_sql).bind(start_ts).bind(end_ts),
        filters,
    );
    let total = count_query.fetch_one::<u64>().await?;

    let items_sql = format!(
        "SELECT \
         toString(id) AS id, \
         toUnixTimestamp64Milli(timestamp) AS timestamp, \
         flow_id, in_iface, host, src_mac, dst_mac, vlan, \
         src_ip, src_port, dst_ip, dst_port, proto, icmp_type, icmp_code, \
         pkt_src, tx_id, app_proto, action, signature_id, signature, category, \
         severity, rule, xff, http_method, http_url, http_protocol, \
         http_req_hdr, http_resp_hdr, http_req_body, http_resp_body, \
         ts_pkts, tc_pkts, ts_bytes, tc_bytes \
         FROM eve_alert_log WHERE {ALERT_TIME_FILTER}{filter_sql} \
         ORDER BY eve_alert_log.timestamp DESC LIMIT ? OFFSET ?"
    );
    let offset = (page - 1) as u64 * page_size as u64;
    let items_query = bind_filter_values(
        client.query(&items_sql).bind(start_ts).bind(end_ts),
        filters,
    );
    let items = items_query
        .bind(page_size as u64)
        .bind(offset)
        .fetch_all::<AlertRow>()
        .await?;

    Ok(AlertPage {
        total,
        page,
        page_size,
        items,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alert::model::{AlertFilterField, AlertFilterOperator};

    fn filter(
        field: AlertFilterField,
        operator: AlertFilterOperator,
        values: &[&str],
    ) -> AlertFilter {
        AlertFilter {
            field,
            operator,
            values: values.iter().map(|value| value.to_string()).collect(),
        }
    }

    #[test]
    fn build_filter_clause_handles_single_multi_and_match() {
        let filters = vec![
            filter(AlertFilterField::SrcPort, AlertFilterOperator::Gte, &["80"]),
            filter(
                AlertFilterField::Proto,
                AlertFilterOperator::In,
                &["TCP", "UDP"],
            ),
            filter(
                AlertFilterField::Signature,
                AlertFilterOperator::Match,
                &["pwd"],
            ),
            filter(
                AlertFilterField::Signature,
                AlertFilterOperator::NotMatch,
                &["test"],
            ),
        ];

        assert_eq!(
            build_filter_clause(&filters),
            "eve_alert_log.src_port >= ? AND eve_alert_log.proto IN (?, ?) AND positionCaseInsensitiveUTF8(eve_alert_log.signature, ?) > 0 AND positionCaseInsensitiveUTF8(eve_alert_log.signature, ?) = 0"
        );
    }

    #[test]
    fn build_filter_clause_is_empty_without_filters() {
        assert_eq!(build_filter_clause(&[]), "");
    }
}
