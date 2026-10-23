import type { AlertRow, AlertSeverity } from '../../../src/types/alert.ts'

const BASE_TIMESTAMP = Date.UTC(2026, 9, 23, 4, 0, 0)
const SEVERITIES: AlertSeverity[] = ['high', 'medium', 'low', 'info']

function encodeBase64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64')
}

export function makeAlert(
  index: number,
  overrides: Partial<AlertRow> = {},
): AlertRow {
  const isHttp = index === 1

  return {
    id: `alert-${index}`,
    timestamp: String(BASE_TIMESTAMP - index * 60_000),
    signature: `Alert ${index}`,
    signature_id: 1000 + index,
    category: 'Test',
    severity: SEVERITIES[(index - 1) % SEVERITIES.length],
    action: 'allowed',
    xff: index % 2 === 0 ? `203.0.113.${index}` : undefined,
    rule: `alert tcp any any -> any any (msg:"Alert ${index}"; sid:${1000 + index};)`,
    src_mac: '00:00:00:00:00:01',
    dst_mac: '00:00:00:00:00:02',
    vlan: index % 3 === 0 ? [100 + index] : [],
    src_ip: `10.0.0.${index}`,
    src_port: 1000 + index,
    dst_ip: '10.0.0.2',
    dst_port: 80,
    proto: index % 2 === 0 ? 'UDP' : 'TCP',
    app_proto: isHttp ? 'http' : 'dns',
    pkt_src: 'wire/pcap',
    ...(isHttp
      ? {
          http_method: 'GET',
          http_url: '/api/login',
          http_protocol: 'HTTP/1.1',
          http_status: 200,
          http_req_hdr: encodeBase64(
            'Host: example.test\r\nUser-Agent: Playwright\r\n\r\n',
          ),
          http_resp_hdr: encodeBase64(
            'Content-Type: application/json\r\nServer: evelens\r\n\r\n',
          ),
          http_req_body: encodeBase64('{"user":"alice"}'),
          http_resp_body: encodeBase64('{"ok":true}'),
          http_resp_line: 'HTTP/1.1 200 OK',
        }
      : {}),
    ts_pkts: String(4 + index),
    tc_pkts: String(2 + index),
    ts_bytes: String(700 + index * 10),
    tc_bytes: String(500 + index * 10),
    ...overrides,
  }
}

export function makeAlerts(count = 21): AlertRow[] {
  return Array.from({ length: count }, (_, index) => makeAlert(index + 1))
}

export const DEFAULT_ALERTS = makeAlerts()
