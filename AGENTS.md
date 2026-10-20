# evelens 项目开发指南

## 项目概述

1. `suricata` 告警与会话的可视化
2. 技术栈：
   - Rust
   - Redis (可选)
   - Clickhouse
   - Ant Design

## 项目结构

| 目录             | 描述                           |
| ---------------- | ------------------------------ |
| docs             | 项目文档                       |
| docker           | docker 配置                    |
| systemd          | systemd 脚本                   |
| crates/elog      | 组件日志初始化封装             |
| crates/eveschema | eve-log 日志结构定义           |
| evelog           | eve-log 日志消费与入库         |
| console          | Web Server                     |
| web              | Frontend powered by Ant Design |

## Lint

Run `clippy` to catch common mistakes and improve your Rust code.

```bash
cargo clippy --workspace --all-targets
```

## Build and test

```bash
cargo build --workspace --all-targets
cargo test --workspace --all-targets
```
