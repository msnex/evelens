import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPresetTimeRange,
  formatTimeRange,
  isSameTimeRange,
  refreshPresetTimeRange,
  type TimeRangePreset,
} from '../../../../src/pages/alert-log/timeRange.ts'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const NOW = new Date(2026, 0, 15, 12, 34, 56, 789)

describe('timeRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    ['lastHour', HOUR_MS],
    ['lastDay', DAY_MS],
    ['last3Days', 3 * DAY_MS],
    ['last7Days', 7 * DAY_MS],
    ['last30Days', 30 * DAY_MS],
  ] satisfies Array<[TimeRangePreset, number]>)(
    'creates the %s preset',
    (preset, duration) => {
      const range = createPresetTimeRange(preset)
      const expectedEnd = new Date(NOW)
      expectedEnd.setMilliseconds(0)

      expect(range.preset).toBe(preset)
      expect(range.end).toBe(expectedEnd.getTime())
      expect(range.start).toBe(expectedEnd.getTime() - duration)
    },
  )

  it('refreshes preset ranges relative to the current time', () => {
    const range = createPresetTimeRange('lastHour')
    const nextNow = new Date(NOW.getTime() + 60_000)
    vi.setSystemTime(nextNow)

    const refreshed = refreshPresetTimeRange(range)

    expect(refreshed.preset).toBe('lastHour')
    expect(refreshed.end).toBe(range.end + 60_000)
    expect(refreshed.start).toBe(refreshed.end - HOUR_MS)
  })

  it('keeps custom ranges unchanged', () => {
    const custom = { start: 100, end: 200, preset: null }

    expect(refreshPresetTimeRange(custom)).toBe(custom)
  })

  it('formats same-day and cross-day ranges', () => {
    expect(
      formatTimeRange({
        start: new Date(2026, 0, 15, 10, 0, 0).getTime(),
        end: new Date(2026, 0, 15, 12, 30, 0).getTime(),
      }),
    ).toBe('2026-01-15 10:00:00 - 12:30:00')

    expect(
      formatTimeRange({
        start: new Date(2026, 0, 15, 10, 0, 0).getTime(),
        end: new Date(2026, 0, 16, 12, 30, 0).getTime(),
      }),
    ).toBe('2026-01-15 10:00:00 - 2026-01-16 12:30:00')
  })

  it('compares only start and end timestamps', () => {
    expect(
      isSameTimeRange(
        { start: 100, end: 200, preset: 'lastHour' },
        { start: 100, end: 200, preset: null },
      ),
    ).toBe(true)
    expect(
      isSameTimeRange(
        { start: 100, end: 200, preset: 'lastHour' },
        { start: 100, end: 201, preset: 'lastHour' },
      ),
    ).toBe(false)
  })
})
