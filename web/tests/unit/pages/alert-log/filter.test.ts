import { describe, expect, it } from 'vitest'
import {
  MAX_ALERT_FILTERS,
  alertFilterKey,
  buildAlertFilter,
  formatAlertFilter,
  getFilterField,
  getFilterOperator,
  getFilterOperators,
  isSameAlertFilter,
  isMultiValueOperator,
  isValidIp,
  isValidPort,
  normalizeValues,
} from '../../../../src/pages/alert-log/filter.ts'
import type {
  AlertFilter,
  AlertFilterField,
  AlertFilterOperator,
} from '../../../../src/types/alert.ts'

const t = (key: string) =>
  ({
    'detail.severity.high': '高',
    'filter.field.severity': '严重级别',
    'filter.operator.eq': '等于',
  })[key] ?? key

describe('normalizeValues', () => {
  it('trims, drops empty values and de-duplicates while preserving order', () => {
    expect(normalizeValues([' TCP ', '', 'TCP', ' udp ', 'UDP'])).toEqual([
      'TCP',
      'udp',
      'UDP',
    ])
  })
})

describe('isValidPort', () => {
  it.each(['0', '80', '65535'])('accepts %s', (value) => {
    expect(isValidPort(value)).toBe(true)
  })

  it.each(['-1', '1.5', '65536', 'abc', ''])('rejects %s', (value) => {
    expect(isValidPort(value)).toBe(false)
  })
})

describe('isValidIp', () => {
  it.each(['192.168.1.1', '0.0.0.0', '255.255.255.255', '::1', '2001:db8::1'])(
    'accepts %s',
    (value) => {
      expect(isValidIp(value)).toBe(true)
    },
  )

  it.each([
    '999.1.1.1',
    '01.2.3.4',
    '192.168.1',
    '1.2.3.4.5',
    'hello',
    '',
    'fe80::1%eth0',
  ])('rejects %s', (value) => {
    expect(isValidIp(value)).toBe(false)
  })
})

describe('buildAlertFilter', () => {
  it('returns empty when no field, operator or values are provided', () => {
    expect(buildAlertFilter(undefined, undefined, [])).toEqual({
      status: 'empty',
    })
  })

  it('returns empty when a multi-value operator has no values', () => {
    expect(buildAlertFilter('proto', 'in', [])).toEqual({ status: 'empty' })
  })

  it('rejects a missing field', () => {
    expect(buildAlertFilter(undefined, 'eq', ['TCP'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidValues',
    })
  })

  it('rejects a missing operator', () => {
    expect(buildAlertFilter('proto', undefined, ['TCP'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidValues',
    })
  })

  it('rejects an unsupported operator for the field', () => {
    expect(buildAlertFilter('signature', 'gt', ['x'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidOperator',
    })
  })

  it('rejects multiple values for a single-value operator', () => {
    expect(buildAlertFilter('signature', 'eq', ['a', 'b'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidValues',
    })
  })

  it('rejects invalid ports', () => {
    expect(buildAlertFilter('src_port', 'eq', ['70000'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidPort',
    })
  })

  it('rejects invalid IP addresses', () => {
    expect(buildAlertFilter('src_ip', 'eq', ['999.1.1.1'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidIp',
    })
  })

  it('rejects invalid severity values', () => {
    expect(buildAlertFilter('severity', 'eq', ['critical'])).toEqual({
      status: 'invalid',
      messageKey: 'filter.invalidValues',
    })
  })

  it('builds a valid single-value filter', () => {
    expect(buildAlertFilter('proto', 'eq', ['TCP'])).toEqual({
      status: 'valid',
      filter: { field: 'proto', operator: 'eq', values: ['TCP'] },
    })
  })

  it('normalizes and de-duplicates multi-value filters', () => {
    expect(buildAlertFilter('proto', 'in', ['TCP', ' TCP ', 'UDP'])).toEqual({
      status: 'valid',
      filter: { field: 'proto', operator: 'in', values: ['TCP', 'UDP'] },
    })
  })

  it('accepts a valid severity filter', () => {
    expect(buildAlertFilter('severity', 'eq', ['high'])).toEqual({
      status: 'valid',
      filter: { field: 'severity', operator: 'eq', values: ['high'] },
    })
  })
})

describe('filter metadata', () => {
  it('exposes known field and operator metadata', () => {
    expect(getFilterField('src_port').input).toBe('number')
    expect(getFilterOperators('signature')).toEqual([
      'eq',
      'ne',
      'match',
      'not_match',
    ])
    expect(getFilterOperator('not_in')).toMatchObject({
      value: 'not_in',
      labelKey: 'filter.operator.notIn',
    })
  })

  it('throws for unknown field or operator values', () => {
    expect(() =>
      getFilterField('unknown' as AlertFilterField),
    ).toThrow('Unknown alert filter field')
    expect(() =>
      getFilterOperator('unknown' as AlertFilterOperator),
    ).toThrow('Unknown alert filter operator')
  })

  it('identifies multi-value operators', () => {
    expect(isMultiValueOperator('in')).toBe(true)
    expect(isMultiValueOperator('not_in')).toBe(true)
    expect(isMultiValueOperator('eq')).toBe(false)
    expect(isMultiValueOperator('match')).toBe(false)
  })

  it('compares filter identity', () => {
    const left: AlertFilter = {
      field: 'proto',
      operator: 'eq',
      values: ['TCP'],
    }
    const right: AlertFilter = {
      field: 'proto',
      operator: 'eq',
      values: ['TCP'],
    }
    const different: AlertFilter = {
      field: 'proto',
      operator: 'ne',
      values: ['TCP'],
    }

    expect(alertFilterKey(left)).toBe(alertFilterKey(right))
    expect(isSameAlertFilter(left, right)).toBe(true)
    expect(isSameAlertFilter(left, different)).toBe(false)
  })

  it('formats filters with operator summaries and translated severity labels', () => {
    expect(
      formatAlertFilter(
        { field: 'src_port', operator: 'gt', values: ['1000'] },
        t,
      ),
    ).toBe('filter.field.srcPort > 1000')

    expect(
      formatAlertFilter(
        { field: 'severity', operator: 'eq', values: ['high'] },
        t,
      ),
    ).toBe('严重级别 = 高')

    expect(
      formatAlertFilter(
        { field: 'proto', operator: 'in', values: ['TCP', 'UDP'] },
        t,
      ),
    ).toBe('filter.field.proto filter.operator.in TCP, UDP')
  })

  it('keeps the documented filter limit', () => {
    expect(MAX_ALERT_FILTERS).toBe(16)
  })
})
