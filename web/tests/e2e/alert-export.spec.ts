import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { createMockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  applyProtoFilter,
  setLocale,
  waitForAlertRows,
} from './support/ui.ts'

type SetupOptions = NonNullable<Parameters<typeof createMockAlertApi>[1]>

async function setup(
  page: Page,
  options: SetupOptions = {},
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
) {
  const api = await createMockAlertApi(page, {
    alerts: makeAlerts(),
    ...options,
  })
  await setLocale(page, locale)
  await page.goto('/')
  await waitForAlertRows(page)
  return api
}

function exportDialog(page: Page): Locator {
  return page.getByRole('dialog')
}

async function selectExportField(page: Page, label: string) {
  const dialog = exportDialog(page)
  const sourceList = dialog.locator('.ant-transfer-section').first()
  await sourceList
    .locator('.ant-transfer-list-body-search-wrapper input')
    .fill(label)
  await sourceList
    .locator('.ant-transfer-list-content-item')
    .filter({ hasText: label })
    .first()
    .click()
  await dialog.locator('.ant-transfer-actions button').first().click()
}

async function confirmExport(page: Page) {
  const dialog = exportDialog(page)
  const downloadPromise = page.waitForEvent('download')
  await dialog.locator('.ant-modal-footer .ant-btn-primary').click()
  return downloadPromise
}

test('导出对话框展示时间范围与过滤条件，并按所选字段下载 CSV', async ({
  page,
}) => {
  const api = await setup(page)
  await applyProtoFilter(page, 'TCP')
  const listRequest = api.lastAlertRequest()
  const rangeText = await page.locator('.time-range-widget-range').textContent()

  await page.getByRole('button', { name: '日志导出' }).click()
  const dialog = exportDialog(page)

  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(rangeText ?? '')
  await expect(dialog.getByText('协议 = TCP')).toBeVisible()
  await expect(dialog.locator('.ant-modal-footer .ant-btn-primary')).toBeDisabled()

  await selectExportField(page, '告警名称')
  await selectExportField(page, 'HTTP 请求方法')

  const download = await confirmExport(page)

  expect(download.suggestedFilename()).toMatch(
    /^alerts-\d{8}-\d{6}-\d{8}-\d{6}\.csv$/,
  )
  await expect.poll(() => api.lastExportRequest()).toMatchObject({
    start_ts: listRequest?.start_ts,
    end_ts: listRequest?.end_ts,
    filters: listRequest?.filters,
    fields: ['http_method', 'signature'],
    locale: 'zh-CN',
  })
  await expect(page.getByText('日志导出成功')).toBeVisible()
  await expect(page.locator('.ant-notification-notice')).toBeHidden()
})

test('超过导出行数上限时截断并显示页面提示', async ({ page }) => {
  const api = await setup(page, {
    exportTruncated: true,
    exportTotal: '21',
    exportExported: '5',
    exportMaxRows: '5',
  })

  await page.getByRole('button', { name: '日志导出' }).click()
  await selectExportField(page, '告警名称')
  await confirmExport(page)

  await expect.poll(() => api.lastExportRequest()?.fields).toEqual([
    'signature',
  ])
  const notice = page.locator('.ant-notification-notice')
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('本次导出共匹配 21 条')
  await expect(notice).toContainText('已导出前 5 条')
  await expect(page.getByText('日志导出失败')).toBeHidden()
})

test('空数据时不下发 CSV 并显示页面提示', async ({ page }) => {
  await setup(page, { exportEmpty: true })
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))

  await page.getByRole('button', { name: '日志导出' }).click()
  await selectExportField(page, '告警名称')
  await exportDialog(page).locator('.ant-modal-footer .ant-btn-primary').click()

  const notice = page.locator('.ant-notification-notice')
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('当前条件下没有可导出的告警数据')
  await expect(exportDialog(page)).toBeHidden()
  await expect(page.getByText('日志导出成功')).toBeHidden()
  await page.waitForTimeout(250)
  expect(downloads).toEqual([])
})

test('全局导出提示自动关闭', async ({ page }) => {
  await setup(page, { exportEmpty: true })
  await page.clock.install()

  await page.getByRole('button', { name: '日志导出' }).click()
  await selectExportField(page, '告警名称')
  await exportDialog(page).locator('.ant-modal-footer .ant-btn-primary').click()

  const notice = page.locator('.ant-notification-notice')
  await expect(notice).toBeVisible()
  await page.clock.runFor(6000)
  await expect(notice).toBeHidden()
})

test('英文模式下对话框加宽且 Time range 不换行', async ({ page }) => {
  await setup(page, {}, 'en-US')

  await page.getByRole('button', { name: 'Export Logs' }).click()
  const dialog = exportDialog(page)
  const dialogBox = await dialog.boundingBox()

  expect(dialogBox).not.toBeNull()
  expect(dialogBox!.width).toBeGreaterThanOrEqual(900)

  const timeRangeLabel = dialog.getByText('Time range', { exact: true })
  await expect(timeRangeLabel).toBeVisible()
  const labelBox = await timeRangeLabel.boundingBox()
  expect(labelBox).not.toBeNull()
  expect(labelBox!.height).toBeLessThan(30)

  const timeRangeValue = dialog.locator('.alert-export-summary-value').nth(0)
  const noFilters = dialog.getByText(
    'None (all alerts in the selected range)',
    { exact: true },
  )
  const [rangeBox, noFiltersBox] = await Promise.all([
    timeRangeValue.boundingBox(),
    noFilters.boundingBox(),
  ])
  expect(rangeBox).not.toBeNull()
  expect(noFiltersBox).not.toBeNull()
  expect(Math.abs(rangeBox!.x - noFiltersBox!.x)).toBeLessThanOrEqual(1)
})

test('导出失败时保留对话框并提示错误', async ({ page }) => {
  await setup(page, { failExportStatus: 500 })

  await page.getByRole('button', { name: '日志导出' }).click()
  await selectExportField(page, '告警名称')
  await exportDialog(page).locator('.ant-modal-footer .ant-btn-primary').click()

  await expect(page.getByText('日志导出失败')).toBeVisible()
  await expect(exportDialog(page)).toBeVisible()
})
