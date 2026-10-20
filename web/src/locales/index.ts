import enUS from './en-US.ts'
import zhCN from './zh-CN.ts'
import type { MessageKey } from './zh-CN.ts'

export type Locale = 'zh-CN' | 'en-US'
export type { MessageKey }

export const messages: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}
