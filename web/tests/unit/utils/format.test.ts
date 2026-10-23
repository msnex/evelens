import { describe, expect, it } from 'vitest'
import {
  formatAppProto,
  formatCount,
  formatPort,
  formatText,
  formatTimestamp,
} from '../../../src/utils/format.ts'

describe('formatTimestamp', () => {
  it('formats a valid millisecond timestamp in local time', () => {
    const timestamp = new Date(2026, 0, 2, 3, 4, 5, 6).getTime()

    expect(formatTimestamp(String(timestamp))).toBe('2026-01-02 03:04:05.006')
  })

  it('returns -- for empty, non-numeric or NaN values', () => {
    expect(formatTimestamp('')).toBe('--')
    expect(formatTimestamp('abc')).toBe('--')
    expect(formatTimestamp('NaN')).toBe('--')
  })
})

describe('formatCount', () => {
  it('formats numeric strings with locale separators', () => {
    expect(formatCount('1000000', 'en-US')).toBe('1,000,000')
    expect(formatCount('21', 'zh-CN')).toBe('21')
  })

  it('supports large counts and falls back for invalid values', () => {
    expect(formatCount('9007199254740993', 'en-US')).toBe(
      '9,007,199,254,740,993',
    )
    expect(formatCount('not-a-number', 'en-US')).toBe('not-a-number')
  })
})

describe('formatAppProto', () => {
  it('returns -- for empty and failed protocols', () => {
    expect(formatAppProto(undefined)).toBe('--')
    expect(formatAppProto(null)).toBe('--')
    expect(formatAppProto('')).toBe('--')
    expect(formatAppProto('   ')).toBe('--')
    expect(formatAppProto('failed')).toBe('--')
    expect(formatAppProto('FAILED')).toBe('--')
  })

  it('returns a normal protocol unchanged', () => {
    expect(formatAppProto('http')).toBe('http')
    expect(formatAppProto('dns')).toBe('dns')
  })
})

describe('formatText', () => {
  it('trims text and returns -- when empty', () => {
    expect(formatText('  hello  ')).toBe('hello')
    expect(formatText(undefined)).toBe('--')
    expect(formatText(null)).toBe('--')
    expect(formatText('   ')).toBe('--')
  })
})

describe('formatPort', () => {
  it('returns -- for missing, invalid, zero or negative ports', () => {
    expect(formatPort(undefined)).toBe('--')
    expect(formatPort(null)).toBe('--')
    expect(formatPort(0)).toBe('--')
    expect(formatPort(-1)).toBe('--')
    expect(formatPort(Number.NaN)).toBe('--')
  })

  it('returns valid ports as strings', () => {
    expect(formatPort(80)).toBe('80')
    expect(formatPort(65535)).toBe('65535')
  })
})
