# evelens

## Build

```bash
# web
pnpm --prefix web build

# rust
cargo build --release --workspace --all-targets
```

## Run

### Clickhouse

```bash
docker compose -f docker/clickhouse-compose.yml up -d
```

### evelog

```bash
cargo run -p evelog -- -c ./evelog/evelog.toml
```

### console

```bash
cargo run -p console -- -c ./console/console.toml
```
