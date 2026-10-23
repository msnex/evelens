import { expect, type Locator, type Page } from '@playwright/test'

export async function setLocale(
  page: Page,
  locale: 'zh-CN' | 'en-US',
): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('evelens.locale', value)
  }, locale)
}

export function alertRows(page: Page): Locator {
  return page.locator('.ant-table-tbody tr.ant-table-row')
}

export async function waitForAlertRows(page: Page): Promise<Locator> {
  const rows = alertRows(page)
  await rows.first().waitFor({ state: 'visible', timeout: 15_000 })
  return rows
}

export function detailDrawer(page: Page): Locator {
  return page.locator('.alert-detail-drawer')
}

export async function openAlertDetail(
  page: Page,
  rowIndex = 0,
): Promise<Locator> {
  await alertRows(page).nth(rowIndex).locator('button').click()
  const drawer = detailDrawer(page)
  await expect(drawer.locator('.alert-detail-field-value').first()).toBeVisible()
  return drawer
}

export async function detailSignature(page: Page): Promise<string> {
  return (
    (await page
      .locator('.alert-detail-drawer .alert-detail-field-value')
      .first()
      .textContent()) ?? ''
  ).trim()
}

export async function waitForDetailSignature(
  page: Page,
  signature: string,
): Promise<void> {
  await expect(
    page.locator('.alert-detail-drawer .alert-detail-field-value').first(),
  ).toHaveText(signature)
}

export function navButtons(page: Page): {
  previous: Locator
  next: Locator
} {
  const extra = page.locator('.alert-detail-drawer .ant-drawer-extra')
  return {
    previous: extra.locator('button').nth(0),
    next: extra.locator('button').nth(1),
  }
}

export async function closeDrawer(page: Page): Promise<void> {
  await page.locator('.alert-detail-drawer .ant-drawer-close').click()
  await expect(
    page.locator('.alert-detail-drawer .alert-detail-field-value').first(),
  ).toBeHidden()
}

export function activePage(page: Page): Locator {
  return page.locator('.ant-pagination-item-active')
}

export async function waitForActivePage(
  page: Page,
  pageNumber: number,
): Promise<void> {
  await expect(activePage(page)).toHaveText(String(pageNumber))
}

export async function goToPage(page: Page, pageNumber: number): Promise<void> {
  await page.locator(`.ant-pagination-item[title="${pageNumber}"]`).click()
  await waitForActivePage(page, pageNumber)
}

export async function quickJump(
  page: Page,
  pageNumber: number,
): Promise<void> {
  const input = page.locator('.ant-pagination-options-quick-jumper input')
  await input.fill(String(pageNumber))
  await input.press('Enter')
  await waitForActivePage(page, pageNumber)
}

export async function changePageSize(
  page: Page,
  pageSize: number,
): Promise<void> {
  await page.locator('.ant-pagination-options .ant-select').click()
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: new RegExp(`^${pageSize}(?:\\s|$)`) })
    .first()
    .click()
}

export async function selectAntOption(
  page: Page,
  trigger: Locator,
  searchValue: string,
): Promise<void> {
  await trigger.click()
  await trigger.locator('input').fill(searchValue)
  await page.keyboard.press('Enter')
}

export async function selectFilterField(
  page: Page,
  value: string,
): Promise<void> {
  await selectAntOption(
    page,
    page.locator('.alert-filter-editor .ant-select').nth(0),
    value,
  )
}

export async function selectFilterOperator(
  page: Page,
  value: string,
): Promise<void> {
  await selectAntOption(
    page,
    page.locator('.alert-filter-editor .ant-select').nth(1),
    value,
  )
}

export async function applyProtoFilter(
  page: Page,
  value = 'TCP',
): Promise<void> {
  await selectFilterField(page, 'proto')
  await selectFilterOperator(page, 'eq')
  await selectAntOption(
    page,
    page.locator('.alert-filter-value .ant-select'),
    value,
  )
  await page.getByRole('button', { name: '搜索' }).click()
}

export async function addPortFilter(
  page: Page,
  value: number,
): Promise<void> {
  await selectFilterField(page, 'src_port')
  await selectFilterOperator(page, 'eq')
  await page.locator('.alert-filter-value input').fill(String(value))
  await page.getByRole('button', { name: '搜索' }).click()
}

export function filterChips(page: Page): Locator {
  return page.locator('.alert-filter-chip')
}

export async function removeFirstFilter(page: Page): Promise<void> {
  await page
    .locator('.alert-filter-chip')
    .first()
    .locator('.ant-tag-close-icon')
    .click()
}

export async function openTimeRangePanel(page: Page): Promise<void> {
  await page.locator('.time-range-widget').click()
  await expect(page.locator('.time-range-panel')).toBeVisible()
}

export async function selectTimeRangePreset(
  page: Page,
  label: string,
): Promise<void> {
  await openTimeRangePanel(page)
  await page
    .locator('.time-range-presets')
    .getByRole('button', { name: label, exact: true })
    .click()
}

export async function selectCustomTimeRange(
  page: Page,
  startText: string,
  endText: string,
): Promise<void> {
  await openTimeRangePanel(page)
  const inputs = page.locator(
    '.time-range-picker .ant-picker-input input',
  )
  await inputs.nth(0).click()
  await inputs.nth(0).fill(startText)
  await inputs.nth(0).press('Enter')
  await inputs.nth(1).click()
  await inputs.nth(1).fill(endText)
  await inputs.nth(1).press('Enter')
}
