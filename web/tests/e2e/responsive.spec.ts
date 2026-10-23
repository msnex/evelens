import { expect, test } from '@playwright/test'
import { createMockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  detailDrawer,
  navButtons,
  openAlertDetail,
  setLocale,
  waitForAlertRows,
} from './support/ui.ts'

test.use({ viewport: { width: 390, height: 844 } })

test('移动端布局', async ({ page }) => {
  await createMockAlertApi(page, { alerts: makeAlerts() })
  await setLocale(page, 'zh-CN')
  await page.goto('/')
  await waitForAlertRows(page)

  await openAlertDetail(page, 0)
  await page.waitForTimeout(400)

  const drawer = detailDrawer(page)
  const wrapper = drawer.locator('.ant-drawer-content-wrapper')
  const wrapperBox = await wrapper.boundingBox()
  expect(wrapperBox).not.toBeNull()
  expect(wrapperBox!.width).toBeLessThanOrEqual(390.5)

  const title = drawer.locator('.ant-drawer-title')
  const { previous, next } = navButtons(page)
  await expect(title).toBeVisible()
  await expect(previous).toBeVisible()
  await expect(next).toBeVisible()

  const titleBox = await title.boundingBox()
  const previousBox = await previous.boundingBox()
  expect(titleBox).not.toBeNull()
  expect(previousBox).not.toBeNull()
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(previousBox!.x)
})
