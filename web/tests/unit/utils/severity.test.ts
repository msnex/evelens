import { describe, expect, it } from 'vitest'
import {
  SEVERITY_OPTIONS,
  getSeverityOption,
  isSeverityValue,
} from '../../../src/utils/severity.ts'

describe('severity', () => {
  it('recognizes all supported severity values', () => {
    for (const option of SEVERITY_OPTIONS) {
      expect(isSeverityValue(option.value)).toBe(true)
    }
  })

  it('rejects unknown or differently-cased values', () => {
    expect(isSeverityValue('HIGH')).toBe(false)
    expect(isSeverityValue('critical')).toBe(false)
    expect(isSeverityValue('')).toBe(false)
  })

  it('returns the matching severity option', () => {
    expect(getSeverityOption('high')).toMatchObject({
      value: 'high',
      labelKey: 'detail.severity.high',
      color: 'red',
    })
    expect(getSeverityOption('low')).toMatchObject({
      value: 'low',
      labelKey: 'detail.severity.low',
      color: 'blue',
    })
  })

  it('falls back to unknown for missing or unknown values', () => {
    expect(getSeverityOption(undefined).value).toBe('unknown')
    expect(getSeverityOption(null).value).toBe('unknown')
    expect(getSeverityOption('critical').value).toBe('unknown')
  })
})
