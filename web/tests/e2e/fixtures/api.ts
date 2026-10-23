import type { Page, Route } from '@playwright/test'
import type { AlertFilter, AlertRow } from '../../../src/types/alert.ts'

export type AlertRequest = {
  page: number
  page_size: number
  start_ts?: number
  end_ts?: number
  filters?: AlertFilter[]
}

type MockAlertApiOptions = {
  alerts?: AlertRow[]
  total?: string
  protos?: string[]
  appProtos?: string[]
  categories?: string[]
  failAlertsStatus?: number
}

type HeldPage = {
  promise: Promise<void>
  release: () => void
}

export type MockAlertApi = {
  requests: {
    alerts: AlertRequest[]
    protos: unknown[]
    categories: unknown[]
  }
  setAlerts: (alerts: AlertRow[], total?: string) => void
  setFailure: (status: number | null) => void
  holdPage: (page: number) => () => void
  lastAlertRequest: () => AlertRequest | undefined
}

export async function createMockAlertApi(
  page: Page,
  options: MockAlertApiOptions = {},
): Promise<MockAlertApi> {
  let alerts = options.alerts ?? []
  let total = options.total ?? String(alerts.length)
  let failureStatus = options.failAlertsStatus ?? null
  const heldPages = new Map<number, HeldPage>()
  const requests: MockAlertApi['requests'] = {
    alerts: [],
    protos: [],
    categories: [],
  }

  const fulfillJson = (
    route: Route,
    body: unknown,
    status = 200,
  ): Promise<void> =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

  await page.route('**/api/v1/alerts/protos', async (route) => {
    requests.protos.push(route.request().postDataJSON())
    await fulfillJson(route, {
      proto: options.protos ?? ['TCP', 'UDP'],
      app_proto: options.appProtos ?? ['http', 'dns'],
    })
  })

  await page.route('**/api/v1/alerts/categories', async (route) => {
    requests.categories.push(route.request().postDataJSON())
    await fulfillJson(route, {
      category: options.categories ?? ['Test', 'Malware'],
    })
  })

  await page.route('**/api/v1/alerts', async (route) => {
    const body = route.request().postDataJSON() as AlertRequest
    requests.alerts.push(body)

    if (failureStatus !== null) {
      await fulfillJson(
        route,
        { code: '5001', message: 'mock alert request failure' },
        failureStatus,
      )
      return
    }

    const held = heldPages.get(body.page)
    if (held) {
      await held.promise
      heldPages.delete(body.page)
    }

    const offset = (body.page - 1) * body.page_size
    const items = alerts.slice(offset, offset + body.page_size)

    await fulfillJson(route, {
      total,
      page: body.page,
      page_size: body.page_size,
      items,
    })
  })

  return {
    requests,
    setAlerts(nextAlerts, nextTotal) {
      alerts = nextAlerts
      total = nextTotal ?? String(nextAlerts.length)
    },
    setFailure(status) {
      failureStatus = status
    },
    holdPage(pageNumber) {
      let release = () => {}
      const promise = new Promise<void>((resolve) => {
        release = resolve
      })
      heldPages.set(pageNumber, { promise, release })

      return () => {
        heldPages.delete(pageNumber)
        release()
      }
    },
    lastAlertRequest() {
      return requests.alerts.at(-1)
    },
  }
}
