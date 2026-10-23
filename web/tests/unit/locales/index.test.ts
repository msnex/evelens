import { describe, expect, it } from 'vitest'
import { messages } from '../../../src/locales/index.ts'

describe('locale messages', () => {
  it('has the same message keys in Chinese and English', () => {
    const zhKeys = Object.keys(messages['zh-CN']).sort()
    const enKeys = Object.keys(messages['en-US']).sort()

    expect(enKeys).toEqual(zhKeys)
  })

  it('does not contain empty translations', () => {
    for (const [locale, translations] of Object.entries(messages)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('')
      }
    }
  })
})
