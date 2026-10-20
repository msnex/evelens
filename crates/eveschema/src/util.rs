/// Serde helper: deserialize u64 from number, serialize as string.
/// This avoids JavaScript losing precision on nanosecond timestamps
/// that exceed Number.MAX_SAFE_INTEGER (2^53 - 1).
pub mod u64_as_string {
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(value: &u64, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&value.to_string())
        } else {
            value.serialize(serializer)
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: Deserializer<'de>,
    {
        if !deserializer.is_human_readable() {
            return u64::deserialize(deserializer);
        }

        // Accept both number and string in JSON.
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum NumOrStr {
            Num(u64),
            Str(String),
        }
        match NumOrStr::deserialize(deserializer)? {
            NumOrStr::Num(n) => Ok(n),
            NumOrStr::Str(s) => s.parse::<u64>().map_err(serde::de::Error::custom),
        }
    }
}

/// Serde helper: serialize i64 as a string in human-readable formats.
pub mod i64_as_string {
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&value.to_string())
        } else {
            value.serialize(serializer)
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<i64, D::Error>
    where
        D: Deserializer<'de>,
    {
        if !deserializer.is_human_readable() {
            return i64::deserialize(deserializer);
        }

        #[derive(Deserialize)]
        #[serde(untagged)]
        enum NumOrStr {
            Num(i64),
            Str(String),
        }

        match NumOrStr::deserialize(deserializer)? {
            NumOrStr::Num(n) => Ok(n),
            NumOrStr::Str(s) => s.parse::<i64>().map_err(serde::de::Error::custom),
        }
    }
}

pub mod option_u64_as_string {
    use serde::{self, Deserialize, Deserializer};

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Accept number, string, or null
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum NumOrStr {
            Num(u64),
            Str(String),
            Null,
        }
        match Option::<NumOrStr>::deserialize(deserializer)? {
            Some(NumOrStr::Num(n)) => Ok(Some(n)),
            Some(NumOrStr::Str(s)) => {
                if s.is_empty() {
                    Ok(None)
                } else {
                    s.parse::<u64>().map(Some).map_err(serde::de::Error::custom)
                }
            }
            Some(NumOrStr::Null) | None => Ok(None),
        }
    }
}

/// Serde helper for ClickHouse `UUID` columns.
/// JSON uses the canonical UUID string; RowBinary uses the two-u64 wire form.
pub mod clickhouse_uuid {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use uuid::Uuid;

    pub fn serialize<S>(value: &Uuid, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&value.to_string())
        } else {
            let bytes = value.as_bytes();
            let high = u64::from_be_bytes(bytes[..8].try_into().expect("UUID high half"));
            let low = u64::from_be_bytes(bytes[8..].try_into().expect("UUID low half"));
            (high, low).serialize(serializer)
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Uuid, D::Error>
    where
        D: Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            let value = String::deserialize(deserializer)?;
            Uuid::parse_str(&value).map_err(serde::de::Error::custom)
        } else {
            let (high, low) = <(u64, u64)>::deserialize(deserializer)?;
            let mut bytes = [0u8; 16];
            bytes[..8].copy_from_slice(&high.to_be_bytes());
            bytes[8..].copy_from_slice(&low.to_be_bytes());
            Ok(Uuid::from_bytes(bytes))
        }
    }
}

pub fn is_zero_u8(v: &u8) -> bool {
    *v == 0
}

pub fn is_zero_u16(v: &u16) -> bool {
    *v == 0
}

pub fn is_zero_u32(v: &u32) -> bool {
    *v == 0
}

pub fn is_zero_u64(v: &u64) -> bool {
    *v == 0
}
