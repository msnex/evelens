# Web Tests

All web tests live under this directory:

- `unit/`: Vitest tests for pure logic and the API client.
- `e2e/`: Playwright browser tests for the alert log UI.

## Setup

Install the Chromium browser once for E2E tests:

```bash
pnpm --prefix web test:e2e:install
```

Unit tests need no browser or backend.

## Run

```bash
# unit tests
pnpm --prefix web test:unit

# unit tests in watch mode
pnpm --prefix web test:unit:watch

# E2E tests
pnpm --prefix web test:e2e

# Playwright UI
pnpm --prefix web test:e2e:ui

# headed Chromium
pnpm --prefix web test:e2e:headed
```

## Unit Test Structure

| Path | Coverage |
| ---- | -------- |
| `unit/api/alerts.test.ts` | Request payloads, error handling and `ApiError` behavior. |
| `unit/locales/index.test.ts` | Chinese/English message-key parity and non-empty translations. |
| `unit/pages/alert-log/export.test.ts` | Export field catalog, ordering and CSV filename generation. |
| `unit/pages/alert-log/filter.test.ts` | Filter validation, normalization, identity and formatting. |
| `unit/pages/alert-log/timeRange.test.ts` | Preset durations, refresh behavior and range formatting. |
| `unit/utils/base64.test.ts` | Standard/Base64URL decoding and invalid input fallback. |
| `unit/utils/format.test.ts` | Timestamp, protocol, text and port formatting. |
| `unit/utils/severity.test.ts` | Severity detection and option fallback. |

Unit tests use `tests/unit/**/*.test.ts`; Vitest runs in the Node environment
without jsdom or React Testing Library.

## E2E Test Structure

| Path | Purpose |
| ---- | ------- |
| `e2e/fixtures/alerts.ts` | Deterministic `AlertRow` test data, including an HTTP alert with Base64 payloads. |
| `e2e/fixtures/api.ts` | Mocked alert/proto/category APIs with request capture, failure injection, and delayed pages. |
| `e2e/support/ui.ts` | Shared helpers for tables, filters, time range, pagination, and the detail drawer. |
| `e2e/*.spec.ts` | Feature suites for the alert table, filters, export, detail drawer, i18n, and responsive layout. |

E2E tests run against the Vite dev server and mock all backend requests with
`page.route`, so no ClickHouse, console server, or Redis instance is required.

## Conventions

- Set the locale through `localStorage` before navigation; Playwright also uses
  `zh-CN` and `Asia/Shanghai` for deterministic labels and timestamps.
- The E2E fixture contains 21 alerts so pagination has two pages (20 + 1).
- The filter-limit E2E test adds 16 filters through the UI and is marked slow.
- Prefer accessible roles and user-facing text. Avoid adding test-only
  attributes to application code.
- Playwright artifacts are written to `web/test-results/` and
  `web/playwright-report/`; both are ignored by git.
