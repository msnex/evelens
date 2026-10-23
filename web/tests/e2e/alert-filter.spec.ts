import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createMockAlertApi, type MockAlertApi } from './fixtures/api.ts'
import { makeAlerts } from './fixtures/alerts.ts'
import {
  addPortFilter,
  applyProtoFilter,
  filterChips,
  goToPage,
  removeFirstFilter,
  selectCustomTimeRange,
  selectFilterField,
  selectFilterOperator,
  selectTimeRangePreset,
  setLocale,
  waitForAlertRows,
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

test('有效过滤、过滤标签与移除', async ({ page }) => {
  const api = await setup(page)
  await goToPage(page, 2)

  await applyProtoFilter(page, 'TCP')

  await expect.poll(() => api.lastAlertRequest()?.page).toBe(1)
  await expect.poll(() => api.lastAlertRequest()?.filters).toEqual([
    { field: 'proto', operator: 'eq', values: ['TCP'] },
  ])
  await expect(filterChips(page)).toHaveCount(1)
  await expect(filterChips(page).first()).toContainText('协议 = TCP')

  await removeFirstFilter(page)
  await expect(filterChips(page)).toHaveCount(0)
  await expect.poll(() => api.lastAlertRequest()?.filters).toBeUndefined()
})

test('过滤值校验', async ({ page }) => {
  const api = await setup(page)
  await page.waitForTimeout(300)
  const requestCount = api.requests.alerts.length

  await selectFilterField(page, 'src_ip')
  await selectFilterOperator(page, 'eq')
  await page.locator('.alert-filter-value input').fill('999.1.1.1')
  await page.getByRole('button', { name: '搜索' }).click()

  await expect(
    page.getByText('请输入有效的 IP 地址', { exact: true }),
  ).toBeVisible()
  await page.waitForTimeout(300)
  expect(api.requests.alerts.length).toBe(requestCount)
})

test('预设时间范围', async ({ page }) => {
  const api = await setup(page)
  await goToPage(page, 2)

  await selectTimeRangePreset(page, '最近一天')

  await expect.poll(() => api.lastAlertRequest()?.page).toBe(1)
  const request = api.lastAlertRequest()
  expect(request?.start_ts).toBeDefined()
  expect(request?.end_ts).toBeDefined()
  expect(request!.end_ts! - request!.start_ts!).toBe(24 * 60 * 60 * 1000)
  await expect(page.locator('.time-range-panel')).toBeHidden()
})

test('自定义日期范围', async ({ page }) => {
  const api = await setup(page)

  await selectCustomTimeRange(
    page,
    '2026-01-01 00:00:00',
    '2026-01-02 00:00:00',
  )

  await expect.poll(() => api.lastAlertRequest()?.page).toBe(1)
  const request = api.lastAlertRequest()
  expect(request?.start_ts).toBe(
    Date.parse('2026-01-01T00:00:00+08:00'),
  )
  expect(request?.end_ts).toBe(Date.parse('2026-01-02T00:00:00+08:00'))
  await expect(page.locator('.time-range-widget')).toContainText(
    '2026-01-01 00:00:00 - 2026-01-02 00:00:00',
  )
  await expect(page.locator('.time-range-panel')).toBeHidden()
})

test('过滤条件数量限制', async ({ page }) => {
  test.slow()
  test.setTimeout(120_000)

  const api = await setup(page)

  for (let value = 1; value <= 16; value += 1) {
    await addPortFilter(page, value)
    await expect(filterChips(page)).toHaveCount(value)
  }

  await expect.poll(() => api.lastAlertRequest()?.filters?.length).toBe(16)
  const requestCount = api.requests.alerts.length

  await addPortFilter(page, 17)

  await expect(
    page.getByText('最多添加 16 条过滤条件', { exact: true }),
  ).toBeVisible()
  await expect(filterChips(page)).toHaveCount(16)
  await page.waitForTimeout(300)
  expect(api.requests.alerts.length).toBe(requestCount)
})
