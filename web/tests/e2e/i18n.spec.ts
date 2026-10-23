import { expect, test } from '@playwright/test'
import { createMockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  closeDrawer,
  navButtons,
  openAlertDetail,
  waitForAlertRows,
} from './support/ui.ts'

test('语言切换与持久化', async ({ page }) => {
  await createMockAlertApi(page, { alerts: makeAlerts() })
  await page.goto('/')
  await waitForAlertRows(page)

  await expect(page.getByText('告警日志', { exact: true })).toBeVisible()
  await expect(page.locator('.ant-table-thead th').nth(1)).toHaveText('告警名称')

  await openAlertDetail(page, 0)
  await expect(page.getByText('告警详情', { exact: true })).toBeVisible()
  const zhButtons = navButtons(page)
  await expect(zhButtons.previous).toHaveText('上一条')
  await expect(zhButtons.next).toHaveText('下一条')
  await closeDrawer(page)

  await page.getByRole('button', { name: '中文 / English' }).click()

  await expect(page.getByText('Alert Logs', { exact: true })).toBeVisible()
  await expect(page.locator('.ant-table-thead th').nth(1)).toHaveText('Signature')

  await openAlertDetail(page, 0)
  await expect(page.getByText('Alert Details', { exact: true })).toBeVisible()

  const enButtons = navButtons(page)
  await expect(enButtons.previous).toHaveText('Previous')
  await expect(enButtons.next).toHaveText('Next')
  await page.waitForTimeout(200)

  const previousBox = await enButtons.previous.boundingBox()
  const nextBox = await enButtons.next.boundingBox()
  expect(previousBox).not.toBeNull()
  expect(nextBox).not.toBeNull()
  expect(Math.abs(previousBox!.width - nextBox!.width)).toBeLessThan(0.5)
  expect(Math.abs(previousBox!.height - nextBox!.height)).toBeLessThan(0.5)

  await page.reload()
  await waitForAlertRows(page)
  await expect(page.getByText('Alert Logs', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('evelens.locale')),
  ).toBe('en-US')
})
