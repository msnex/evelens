import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createMockAlertApi, type MockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  activePage,
  closeDrawer,
  detailDrawer,
  navButtons,
  openAlertDetail,
  setLocale,
  waitForActivePage,
  waitForAlertRows,
  waitForDetailSignature,
} from './support/ui.ts'

async function setup(page: Page): Promise<MockAlertApi> {
  const api = await createMockAlertApi(page, {
    alerts: makeAlerts(),
  })
  await setLocale(page, 'zh-CN')
  await page.goto('/')
  await waitForAlertRows(page)
  return api
}

test('详情内容与 HTTP 区域', async ({ page }) => {
  await setup(page)
  await openAlertDetail(page, 0)

  const drawer = detailDrawer(page)
  await expect(drawer.getByText('告警详情', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Alert 1', { exact: true })).toBeVisible()
  await expect(
    drawer
      .locator('.alert-detail-field')
      .filter({ hasText: '规则 ID' })
      .locator('.alert-detail-field-value'),
  ).toHaveText('1001')
  await expect(drawer.getByText('10.0.0.1', { exact: true })).toBeVisible()
  await expect(drawer.getByText('应用 (HTTP)', { exact: true })).toBeVisible()
  await expect(
    drawer.getByText('GET /api/login HTTP/1.1', { exact: true }),
  ).toBeVisible()
  await expect(
    drawer.locator('.alert-detail-pre').filter({ hasText: 'Host: example.test' }),
  ).toBeVisible()
  await expect(
    drawer
      .locator('.alert-detail-pre')
      .filter({ hasText: 'HTTP/1.1 200 OK' }),
  ).toBeVisible()

  const { previous, next } = navButtons(page)
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
})

test('同页/跨页切换与表格同步', async ({ page }) => {
  await setup(page)
  await openAlertDetail(page, 0)

  const { previous, next } = navButtons(page)
  await next.click()
  await waitForDetailSignature(page, 'Alert 2')
  await expect(previous).toBeEnabled()

  await previous.click()
  await waitForDetailSignature(page, 'Alert 1')
  await closeDrawer(page)

  await openAlertDetail(page, 19)
  await waitForDetailSignature(page, 'Alert 20')
  await next.click()
  await waitForDetailSignature(page, 'Alert 21')
  await waitForActivePage(page, 2)
  await expect(next).toBeDisabled()
  await expect(previous).toBeEnabled()

  await previous.click()
  await waitForDetailSignature(page, 'Alert 20')
  await waitForActivePage(page, 1)

  await next.click()
  await waitForDetailSignature(page, 'Alert 21')
  await waitForActivePage(page, 2)
  await closeDrawer(page)
  await expect(activePage(page)).toHaveText('2')
})

test('跨页加载状态', async ({ page }) => {
  const api = await setup(page)
  await openAlertDetail(page, 19)

  const release = api.holdPage(2)
  const { previous, next } = navButtons(page)
  await next.click()

  await expect(previous).toBeDisabled()
  await expect(next).toBeDisabled()
  await expect(next).toHaveClass(/ant-btn-loading/)

  release()
  await waitForDetailSignature(page, 'Alert 21')
  await waitForActivePage(page, 2)
})

test('跨页失败', async ({ page }) => {
  const api = await setup(page)
  await openAlertDetail(page, 19)

  const { previous, next } = navButtons(page)
  api.setFailure(500)
  await next.click()

  await expect(
    page.getByText('切换告警失败', { exact: true }),
  ).toBeVisible()
  await waitForDetailSignature(page, 'Alert 20')
  await expect(activePage(page)).toHaveText('1')
  await expect(previous).toBeEnabled()
  await expect(next).toBeEnabled()
})
