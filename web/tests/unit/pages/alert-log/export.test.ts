import { describe, expect, it } from 'vitest'
import {
  ALERT_EXPORT_FIELDS,
  buildAlertExportFilename,
} from '../../../../src/pages/alert-log/export.ts'

describe('alert export fields', () => {
  it('contains all supported fields once', () => {
    const values = ALERT_EXPORT_FIELDS.map((field) => field.value)

    expect(values).toHaveLength(34)
    expect(new Set(values).size).toBe(34)
    expect(values).toContain('signature')
    expect(values).toContain('timestamp')
    expect(values).toContain('http_method')
    expect(values).toContain('id')
  })

  it('builds a range-based CSV filename', () => {
    expect(
      buildAlertExportFilename({
        start: Date.UTC(2026, 9, 23, 4, 0, 0),
        end: Date.UTC(2026, 9, 23, 5, 0, 0),
      }),
    ).toMatch(/^alerts-\d{8}-\d{6}-\d{8}-\d{6}\.csv$/)
  })
})
