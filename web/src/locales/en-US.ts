import alertLog from './en-US/alertLog.ts'
import header from './en-US/header.ts'
import menu from './en-US/menu.ts'
import pagination from './en-US/pagination.ts'
import timeRange from './en-US/timeRange.ts'
import type { MessageKey } from './zh-CN.ts'

const enUS: Record<MessageKey, string> = {
  ...alertLog,
  ...header,
  ...menu,
  ...pagination,
  ...timeRange,
}

export default enUS
