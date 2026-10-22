export type AlertSeverity = 'high' | 'medium' | 'low' | 'info' | 'unknown'

export type AlertRow = {
  id: string
  timestamp: string
  signature: string
  signature_id: number
  category: string
  severity: AlertSeverity
  action: string
  xff?: string
  rule?: string
  src_mac: string
  dst_mac: string
  vlan?: number[]
  src_ip: string
  src_port: number
  dst_ip: string
  dst_port: number
  proto: string
  app_proto: string
  pkt_src: string
  http_method?: string
  http_url?: string
  http_protocol?: string
  http_status?: number
  http_req_hdr?: string
  http_resp_hdr?: string
  http_req_body?: string
  http_resp_body?: string
  http_resp_line?: string
  ts_pkts: string
  tc_pkts: string
  ts_bytes: string
  tc_bytes: string
}

export type AlertPage = {
  total: string
  page: number
  page_size: number
  items: AlertRow[]
}

export type AlertFilterField =
  | 'signature'
  | 'severity'
  | 'category'
  | 'src_ip'
  | 'dst_ip'
  | 'src_port'
  | 'dst_port'
  | 'proto'
  | 'app_proto'

export type AlertFilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'match'
  | 'not_match'

export type AlertFilter = {
  field: AlertFilterField
  operator: AlertFilterOperator
  values: string[]
}

export type AlertProtos = {
  proto: string[]
  app_proto: string[]
}

export type AlertCategories = {
  category: string[]
}
