import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createMockAlertApi, type MockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  changePageSize,
  goToPage,
  quickJump,
  setLocale,
  waitForAlertRows,
} from './support/ui.ts'

async function setup(
  page: Page,
  alerts = makeAlerts(),
  total?: string,
  failAlertsStatus?: number,
): Promise<MockAlertApi> {
  const api = await createMockAlertApi(page, {
    alerts,
    total,
    failAlertsStatus,
  })
  await setLocale(page, 'zh-CN')
  await page.goto('/')
  return api
}

test('首屏、列顺序、序号与分页', async ({ page }) => {
  const api = await setup(page)
  const rows = await waitForAlertRows(page)

  await expect(page.getByText('告警日志', { exact: true })).toBeVisible()
  await expect(page.locator('.ant-table-thead th').nth(0)).toHaveText('序号')
  await expect(page.locator('.ant-table-thead th').nth(1)).toHaveText('告警名称')
  await expect(rows).toHaveCount(20)
  await expect(rows.first().locator('td').nth(0)).toHaveText('1')
  await expect(rows.last().locator('td').nth(0)).toHaveText('20')
  await expect(page.getByText('共 21 条')).toBeVisible()

  await goToPage(page, 2)
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('td').nth(0)).toHaveText('21')
  await expect(rows.first()).toContainText('Alert 21')

  await changePageSize(page, 10)
  await expect(rows).toHaveCount(10)
  await expect.poll(() => api.lastAlertRequest()?.page).toBe(1)
  await expect.poll(() => api.lastAlertRequest()?.page_size).toBe(10)
})

test('快速跳页', async ({ page }) => {
  const api = await setup(page)
  const rows = await waitForAlertRows(page)

  await quickJump(page, 2)

  await expect.poll(() => api.lastAlertRequest()?.page).toBe(2)
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Alert 21')
})

test('空状态', async ({ page }) => {
  await setup(page, [], '0')

  await expect(page.getByText('暂无告警', { exact: true })).toBeVisible()
})

test('加载失败与重试', async ({ page }) => {
  const api = await setup(page, makeAlerts(), undefined, 500)

  await expect(
    page.locator('.ant-empty-description').getByText('告警加载失败'),
  ).toBeVisible()
  const retry = page.locator('.ant-empty button')
  await expect(retry).toBeVisible()

  api.setFailure(null)
  await retry.click()
  const rows = await waitForAlertRows(page)

  await expect(rows).toHaveCount(20)
  await expect.poll(() => api.lastAlertRequest()?.page).toBe(1)
})
