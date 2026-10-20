export type AlertRow = {
  id: string
  timestamp: string
  signature: string
  src_ip: string
  src_port: number
  dst_ip: string
  dst_port: number
  proto: string
  app_proto: string
}

export type AlertPage = {
  total: string
  page: number
  page_size: number
  items: AlertRow[]
}

export type AlertFilterField =
  | 'signature'
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
