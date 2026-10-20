import type { MessageKey } from '../../locales/index.ts'
import type {
  AlertFilter,
  AlertFilterField,
  AlertFilterOperator,
} from '../../types/alert.ts'

export const MAX_ALERT_FILTERS = 16

type FilterInputKind = 'text' | 'number' | 'ip' | 'select'
export type FilterOptionSource = 'proto' | 'app_proto' | 'category'

type AlertFilterFieldConfig = {
  value: AlertFilterField
  labelKey: MessageKey
  input: FilterInputKind
  optionSource?: FilterOptionSource
  operators: AlertFilterOperator[]
}

type AlertFilterOperatorConfig = {
  value: AlertFilterOperator
  labelKey: MessageKey
  summary?: string
}

export const ALERT_FILTER_FIELDS: AlertFilterFieldConfig[] = [
  {
    value: 'signature',
    labelKey: 'filter.field.signature',
    input: 'text',
    operators: ['eq', 'ne', 'match', 'not_match'],
  },
  {
    value: 'category',
    labelKey: 'filter.field.category',
    input: 'select',
    optionSource: 'category',
    operators: ['eq', 'ne', 'in', 'not_in'],
  },
  {
    value: 'src_ip',
    labelKey: 'filter.field.srcIp',
    input: 'ip',
    operators: ['eq', 'ne', 'in', 'not_in'],
  },
  {
    value: 'dst_ip',
    labelKey: 'filter.field.dstIp',
    input: 'ip',
    operators: ['eq', 'ne', 'in', 'not_in'],
  },
  {
    value: 'src_port',
    labelKey: 'filter.field.srcPort',
    input: 'number',
    operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'],
  },
  {
    value: 'dst_port',
    labelKey: 'filter.field.dstPort',
    input: 'number',
    operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'],
  },
  {
    value: 'proto',
    labelKey: 'filter.field.proto',
    input: 'select',
    optionSource: 'proto',
    operators: ['eq', 'ne', 'in', 'not_in'],
  },
  {
    value: 'app_proto',
    labelKey: 'filter.field.appProto',
    input: 'select',
    optionSource: 'app_proto',
    operators: ['eq', 'ne', 'in', 'not_in'],
  },
]

const ALERT_FILTER_OPERATORS: AlertFilterOperatorConfig[] = [
  { value: 'eq', labelKey: 'filter.operator.eq', summary: '=' },
  { value: 'ne', labelKey: 'filter.operator.ne', summary: '≠' },
  { value: 'gt', labelKey: 'filter.operator.gt', summary: '>' },
  { value: 'gte', labelKey: 'filter.operator.gte', summary: '≥' },
  { value: 'lt', labelKey: 'filter.operator.lt', summary: '<' },
  { value: 'lte', labelKey: 'filter.operator.lte', summary: '≤' },
  { value: 'in', labelKey: 'filter.operator.in' },
  { value: 'not_in', labelKey: 'filter.operator.notIn' },
  { value: 'match', labelKey: 'filter.operator.match' },
  { value: 'not_match', labelKey: 'filter.operator.notMatch' },
]

export type AlertFilterDraft =
  | { status: 'empty' }
  | { status: 'invalid'; messageKey: MessageKey }
  | { status: 'valid'; filter: AlertFilter }

export function getFilterField(field: AlertFilterField): AlertFilterFieldConfig {
  const config = ALERT_FILTER_FIELDS.find((item) => item.value === field)
  if (!config) {
    throw new Error(`Unknown alert filter field: ${field}`)
  }
  return config
}

export function getFilterOperators(
  field: AlertFilterField,
): AlertFilterOperator[] {
  return getFilterField(field).operators
}

export function getFilterOperator(
  operator: AlertFilterOperator,
): AlertFilterOperatorConfig {
  const config = ALERT_FILTER_OPERATORS.find((item) => item.value === operator)
  if (!config) {
    throw new Error(`Unknown alert filter operator: ${operator}`)
  }
  return config
}

export function isMultiValueOperator(operator: AlertFilterOperator): boolean {
  return operator === 'in' || operator === 'not_in'
}

export function alertFilterKey(filter: AlertFilter): string {
  return `${filter.field}\u0000${filter.operator}\u0000${filter.values.join('\u0001')}`
}

export function isSameAlertFilter(
  left: AlertFilter,
  right: AlertFilter,
): boolean {
  return alertFilterKey(left) === alertFilterKey(right)
}

export function formatAlertFilter(
  filter: AlertFilter,
  t: (key: MessageKey) => string,
): string {
  const field = getFilterField(filter.field)
  const operator = getFilterOperator(filter.operator)
  const operatorLabel = operator.summary ?? t(operator.labelKey)
  return `${t(field.labelKey)} ${operatorLabel} ${filter.values.join(', ')}`
}

export function buildAlertFilter(
  field: AlertFilterField | undefined,
  operator: AlertFilterOperator | undefined,
  values: string[],
): AlertFilterDraft {
  const normalizedValues = normalizeValues(values)

  if (!field && !operator && normalizedValues.length === 0) {
    return { status: 'empty' }
  }

  if (!field || !operator) {
    return { status: 'invalid', messageKey: 'filter.invalidValues' }
  }

  const fieldConfig = getFilterField(field)
  if (!fieldConfig.operators.includes(operator)) {
    return { status: 'invalid', messageKey: 'filter.invalidOperator' }
  }

  if (normalizedValues.length === 0) {
    return { status: 'empty' }
  }

  if (!isMultiValueOperator(operator) && normalizedValues.length !== 1) {
    return { status: 'invalid', messageKey: 'filter.invalidValues' }
  }

  if (
    fieldConfig.input === 'number' &&
    !normalizedValues.every((value) => isValidPort(value))
  ) {
    return { status: 'invalid', messageKey: 'filter.invalidPort' }
  }

  if (
    fieldConfig.input === 'ip' &&
    !normalizedValues.every((value) => isValidIp(value))
  ) {
    return { status: 'invalid', messageKey: 'filter.invalidIp' }
  }

  return {
    status: 'valid',
    filter: {
      field,
      operator,
      values: normalizedValues,
    },
  }
}

export function normalizeValues(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
    result.push(trimmed)
  }

  return result
}

export function isValidPort(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) <= 65535
}

export function isValidIp(value: string): boolean {
  const trimmed = value.trim()
  return isValidIpv4(trimmed) || isValidIpv6(trimmed)
}

function isValidIpv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) {
    return false
  }

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false
    }
    if (part.length > 1 && part.startsWith('0')) {
      return false
    }
    return Number(part) <= 255
  })
}

function isValidIpv6(value: string): boolean {
  if (!value.includes(':') || value.includes('%')) {
    return false
  }

  try {
    const url = new URL(`http://[${value}]/`)
    return url.hostname.startsWith('[')
  } catch {
    return false
  }
}
