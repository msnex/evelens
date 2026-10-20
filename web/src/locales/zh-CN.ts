import alertLog from './zh-CN/alertLog.ts'
import header from './zh-CN/header.ts'
import menu from './zh-CN/menu.ts'
import pagination from './zh-CN/pagination.ts'
import timeRange from './zh-CN/timeRange.ts'

const zhCN = {
  ...alertLog,
  ...header,
  ...menu,
  ...pagination,
  ...timeRange,
} as const

export type MessageKey = keyof typeof zhCN

export default zhCN
