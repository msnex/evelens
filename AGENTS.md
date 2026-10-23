# evelens 项目开发指南

## 项目概述

1. `suricata` 告警与会话的可视化
2. 技术栈：
   - Rust
   - Redis (可选)
   - Clickhouse
   - Ant Design

### 项目结构

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

### Lint

Run lint tools to catch common mistakes and improve your code.

```bash
# web
pnpm --prefix web lint
# rust
cargo clippy --workspace --all-targets
```

### Build and test

```bash
# web
pnpm --prefix web build
# rust
cargo build --workspace --all-targets
cargo test --workspace --all-targets
```

## Web 前端

- 国际化：简体中文（默认）、英文，支持客户端语言自动检测与切换持久化
- 测试用例：关键功能模块需要增加单元测试，业务功能增加E2E测试

### 单元测试

```bash
pnpm --prefix web test:unit
```

### E2E 测试

```bash
pnpm --prefix web test:e2e
```
