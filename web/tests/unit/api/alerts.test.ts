import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  exportAlerts,
  fetchAlertCategories,
  fetchAlertProtos,
  fetchAlerts,
} from '../../../src/api/alerts.ts'
import type { AlertExportField, AlertFilter } from '../../../src/types/alert.ts'

let fetchMock: ReturnType<typeof vi.fn>

function jsonResponse(
  body: unknown,
  options: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body,
  } as Response
}

describe('alert API client', () => {
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts alerts with pagination, range, filters and signal', async () => {
    const page = {
      total: '21',
      page: 1,
      page_size: 20,
      items: [],
    }
    const filters: AlertFilter[] = [
      { field: 'proto', operator: 'eq', values: ['TCP'] },
    ]
    const controller = new AbortController()
    fetchMock.mockResolvedValue(jsonResponse(page))

    await expect(
      fetchAlerts({
        page: 1,
        pageSize: 20,
        startTs: 100,
        endTs: 200,
        filters,
        signal: controller.signal,
      }),
    ).resolves.toEqual(page)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: 1,
        page_size: 20,
        start_ts: 100,
        end_ts: 200,
        filters,
      }),
      signal: controller.signal,
    })
  })

  it('omits optional alert fields when they are not provided', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ total: '0', page: 2, page_size: 50, items: [] }),
    )

    await fetchAlerts({ page: 2, pageSize: 50 })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 2, page_size: 50 }),
      signal: undefined,
    })
  })

  it('posts proto and category option requests', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ proto: ['TCP'], app_proto: ['http'] }),
      )
      .mockResolvedValueOnce(jsonResponse({ category: ['Test'] }))

    await expect(fetchAlertProtos({ startTs: 10, endTs: 20 })).resolves.toEqual(
      { proto: ['TCP'], app_proto: ['http'] },
    )
    await expect(
      fetchAlertCategories({ startTs: 10, endTs: 20 }),
    ).resolves.toEqual({ category: ['Test'] })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/alerts/protos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_ts: 10, end_ts: 20 }),
      signal: undefined,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/alerts/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_ts: 10, end_ts: 20 }),
      signal: undefined,
    })
  })

  it('posts an export request and parses truncation headers', async () => {
    const blob = new Blob(['csv'], { type: 'text/csv' })
    const fields: AlertExportField[] = ['signature', 'timestamp']
    const filters: AlertFilter[] = [
      { field: 'proto', operator: 'eq', values: ['TCP'] },
    ]
    const controller = new AbortController()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'X-Export-Total': '10',
        'X-Export-Exported': '3',
        'X-Export-Truncated': 'true',
        'X-Export-Max-Rows': '3',
      }),
      blob: async () => blob,
    } as Response)

    await expect(
      exportAlerts({
        startTs: 100,
        endTs: 200,
        filters,
        fields,
        locale: 'zh-CN',
        signal: controller.signal,
      }),
    ).resolves.toEqual({
      kind: 'file',
      blob,
      total: '10',
      exported: '3',
      truncated: true,
      maxRows: '3',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/alerts/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_ts: 100,
        end_ts: 200,
        fields,
        locale: 'zh-CN',
        filters,
      }),
      signal: controller.signal,
    })
  })

  it('defaults export truncation metadata when headers are missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      blob: async () => new Blob(['csv']),
    } as Response)

    await expect(
      exportAlerts({
        startTs: 100,
        endTs: 200,
        filters: [],
        fields: ['signature'],
        locale: 'en-US',
      }),
    ).resolves.toMatchObject({
      kind: 'file',
      total: '0',
      exported: '0',
      truncated: false,
      maxRows: '0',
    })
  })

  it('returns an empty result for 204 responses without reading a blob', async () => {
    const blob = vi.fn()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({
        'X-Export-Total': '0',
        'X-Export-Max-Rows': '1000000',
      }),
      blob,
    } as Response)

    await expect(
      exportAlerts({
        startTs: 100,
        endTs: 200,
        filters: [],
        fields: ['signature'],
        locale: 'zh-CN',
      }),
    ).resolves.toEqual({
      kind: 'empty',
      total: '0',
      maxRows: '1000000',
    })
    expect(blob).not.toHaveBeenCalled()
  })

  it('throws ApiError for export validation failures', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: '4009', message: 'at least one export field is required' },
        { ok: false, status: 400 },
      ),
    )

    const error = await exportAlerts({
      startTs: 100,
      endTs: 200,
      filters: [],
      fields: [],
      locale: 'zh-CN',
    }).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: '4009', status: 400 })
  })

  it('throws ApiError for non-2xx responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: '4001', message: 'page must be greater than 0' },
        { ok: false, status: 400 },
      ),
    )

    const error = await fetchAlerts({ page: 0, pageSize: 20 }).catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'page must be greater than 0',
      status: 400,
      code: '4001',
    })
  })

  it('throws when a successful response has no object body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null))

    await expect(fetchAlerts({ page: 1, pageSize: 20 })).rejects.toThrow(
      'Invalid response body',
    )
  })
})
