import type { MessageKey } from '../locales/index.ts'
import type { AlertSeverity } from '../types/alert.ts'

export type SeverityOption = {
  value: AlertSeverity
  labelKey: MessageKey
  color: string
}

export const SEVERITY_OPTIONS: SeverityOption[] = [
  { value: 'high', labelKey: 'detail.severity.high', color: 'red' },
  { value: 'medium', labelKey: 'detail.severity.medium', color: 'orange' },
  { value: 'low', labelKey: 'detail.severity.low', color: 'blue' },
  { value: 'info', labelKey: 'detail.severity.info', color: 'default' },
  { value: 'unknown', labelKey: 'detail.severity.unknown', color: 'default' },
]

const SEVERITY_VALUES = new Set<string>(
  SEVERITY_OPTIONS.map((option) => option.value),
)

export function isSeverityValue(value: string): value is AlertSeverity {
  return SEVERITY_VALUES.has(value)
}

export function getSeverityOption(value?: string | null): SeverityOption {
  return (
    SEVERITY_OPTIONS.find((option) => option.value === value) ??
    SEVERITY_OPTIONS[SEVERITY_OPTIONS.length - 1]
  )
}
