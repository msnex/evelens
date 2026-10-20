import dayjs from 'dayjs'
import type { MessageKey } from '../../locales/index.ts'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type TimeRangePreset =
  | 'lastHour'
  | 'lastDay'
  | 'last3Days'
  | 'last7Days'
  | 'last30Days'

export type TimeRangeValue = {
  start: number
  end: number
  preset: TimeRangePreset | null
}

type TimeRangePresetOption = {
  key: TimeRangePreset
  durationMs: number
  labelKey: MessageKey
}

export const TIME_RANGE_PRESETS = [
  {
    key: 'lastHour',
    durationMs: HOUR_MS,
    labelKey: 'timeRange.lastHour',
  },
  {
    key: 'lastDay',
    durationMs: DAY_MS,
    labelKey: 'timeRange.lastDay',
  },
  {
    key: 'last3Days',
    durationMs: 3 * DAY_MS,
    labelKey: 'timeRange.last3Days',
  },
  {
    key: 'last7Days',
    durationMs: 7 * DAY_MS,
    labelKey: 'timeRange.last7Days',
  },
  {
    key: 'last30Days',
    durationMs: 30 * DAY_MS,
    labelKey: 'timeRange.last30Days',
  },
] as const satisfies readonly TimeRangePresetOption[]

export function createPresetTimeRange(preset: TimeRangePreset): TimeRangeValue {
  const option = TIME_RANGE_PRESETS.find((item) => item.key === preset)!
  const end = dayjs().millisecond(0).valueOf()

  return {
    start: end - option.durationMs,
    end,
    preset,
  }
}

export function refreshPresetTimeRange(
  value: TimeRangeValue,
): TimeRangeValue {
  return value.preset ? createPresetTimeRange(value.preset) : value
}

export function formatTimeRange(
  value: Pick<TimeRangeValue, 'start' | 'end'>,
): string {
  const start = dayjs(value.start)
  const end = dayjs(value.end)

  const startText = start.format('YYYY-MM-DD HH:mm:ss')
  const endText = start.isSame(end, 'day')
    ? end.format('HH:mm:ss')
    : end.format('YYYY-MM-DD HH:mm:ss')

  return `${startText} - ${endText}`
}

export function isSameTimeRange(
  left: TimeRangeValue,
  right: TimeRangeValue,
): boolean {
  return left.start === right.start && left.end === right.end
}
