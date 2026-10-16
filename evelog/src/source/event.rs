use crate::database::clickhouse::{self, Event};
use anyhow::Result;
use eveschema::clickhouse::eve_alert::EveAlertSchema;
use eveschema::eve::EveJsonSchema;

pub fn process_eve(values: &str) -> Result<()> {
    let eve: EveJsonSchema = serde_json::from_str(values)?;

    #[allow(clippy::single_match)]
    match eve.event_type.as_str() {
        "alert" => {
            let eve_alert = EveAlertSchema::try_from(eve)?;
            clickhouse::submit_event(Event::Alert(eve_alert))?;
        }
        _ => {}
    }

    Ok(())
}
