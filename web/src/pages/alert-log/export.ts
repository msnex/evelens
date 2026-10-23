import dayjs from 'dayjs'
import type { MessageKey } from '../../locales/index.ts'
import type { AlertExportField } from '../../types/alert.ts'
import type { TimeRangeValue } from './timeRange.ts'

export type AlertExportFieldOption = {
  value: AlertExportField
  labelKey: MessageKey
}

export const ALERT_EXPORT_FIELDS: AlertExportFieldOption[] = [
  { value: 'signature', labelKey: 'detail.field.signature' },
  { value: 'category', labelKey: 'detail.field.category' },
  { value: 'severity', labelKey: 'detail.field.severity' },
  { value: 'action', labelKey: 'detail.field.action' },
  { value: 'timestamp', labelKey: 'export.field.timestamp' },
  { value: 'signature_id', labelKey: 'detail.field.signatureId' },
  { value: 'rule', labelKey: 'detail.field.rule' },
  { value: 'xff', labelKey: 'detail.field.xff' },
  { value: 'src_mac', labelKey: 'detail.field.srcMac' },
  { value: 'src_ip', labelKey: 'detail.field.srcIp' },
  { value: 'src_port', labelKey: 'detail.field.srcPort' },
  { value: 'dst_mac', labelKey: 'detail.field.dstMac' },
  { value: 'dst_ip', labelKey: 'detail.field.dstIp' },
  { value: 'dst_port', labelKey: 'detail.field.dstPort' },
  { value: 'vlan', labelKey: 'detail.field.vlan' },
  { value: 'proto', labelKey: 'detail.field.proto' },
  { value: 'app_proto', labelKey: 'detail.field.appProto' },
  { value: 'ts_pkts', labelKey: 'detail.field.tsPkts' },
  { value: 'ts_bytes', labelKey: 'detail.field.tsBytes' },
  { value: 'tc_pkts', labelKey: 'detail.field.tcPkts' },
  { value: 'tc_bytes', labelKey: 'detail.field.tcBytes' },
  { value: 'pkt_src', labelKey: 'detail.field.pktSrc' },
  { value: 'http_method', labelKey: 'export.field.httpMethod' },
  { value: 'http_url', labelKey: 'export.field.httpUrl' },
  { value: 'http_protocol', labelKey: 'export.field.httpProtocol' },
  { value: 'http_status', labelKey: 'export.field.httpStatus' },
  { value: 'http_req_hdr', labelKey: 'detail.http.requestHeaders' },
  { value: 'http_req_body', labelKey: 'detail.http.requestBody' },
  { value: 'http_resp_line', labelKey: 'detail.http.responseLine' },
  { value: 'http_resp_hdr', labelKey: 'detail.http.responseHeaders' },
  { value: 'http_resp_body', labelKey: 'detail.http.responseBody' },
  { value: 'in_iface', labelKey: 'export.field.inIface' },
  { value: 'host', labelKey: 'export.field.host' },
  { value: 'id', labelKey: 'export.field.id' },
]

export function buildAlertExportFilename(
  range: Pick<TimeRangeValue, 'start' | 'end'>,
): string {
  const format = (timestamp: number) =>
    dayjs(timestamp).format('YYYYMMDD-HHmmss')

  return `alerts-${format(range.start)}-${format(range.end)}.csv`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
