import { describe, expect, it } from 'vitest'
import { decodeBase64Text } from '../../../src/utils/base64.ts'

const encode = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64')

describe('decodeBase64Text', () => {
  it('decodes standard Base64 ASCII and UTF-8 text', () => {
    expect(decodeBase64Text(encode('Hello, Evelens!'))).toBe('Hello, Evelens!')
    expect(decodeBase64Text(encode('你好，Evelens'))).toBe('你好，Evelens')
  })

  it('decodes Base64URL input', () => {
    const base64Url = encode('ÿÿ').replace(/\+/g, '-').replace(/\//g, '_')

    expect(base64Url).toContain('_')
    expect(decodeBase64Text(base64Url)).toBe('ÿÿ')
  })

  it('ignores whitespace and missing padding', () => {
    const encoded = encode('line one\nline two')

    expect(decodeBase64Text(`  ${encoded.slice(0, 4)}\n${encoded.slice(4)}  `)).toBe(
      'line one\nline two',
    )
    expect(decodeBase64Text(encoded.replace(/=+$/, ''))).toBe(
      'line one\nline two',
    )
  })

  it('returns an empty string for empty input', () => {
    expect(decodeBase64Text(undefined)).toBe('')
    expect(decodeBase64Text(null)).toBe('')
    expect(decodeBase64Text('   ')).toBe('')
  })

  it('returns the original input for invalid Base64', () => {
    expect(decodeBase64Text('!!!!')).toBe('!!!!')
  })
})
