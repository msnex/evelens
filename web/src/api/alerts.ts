import type {
  AlertCategories,
  AlertExportField,
  AlertExportLocale,
  AlertFilter,
  AlertPage,
  AlertProtos,
} from '../types/alert.ts'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type FetchAlertsOptions = {
  page: number
  pageSize: number
  startTs?: number
  endTs?: number
  filters?: AlertFilter[]
  signal?: AbortSignal
}

type FetchOptions = {
  startTs: number
  endTs: number
  signal?: AbortSignal
}

type ExportAlertsOptions = {
  startTs: number
  endTs: number
  filters: AlertFilter[]
  fields: AlertExportField[]
  locale: AlertExportLocale
  signal?: AbortSignal
}

export type AlertExportResult =
  | {
      kind: 'file'
      blob: Blob
      total: string
      exported: string
      truncated: boolean
      maxRows: string
    }
  | {
      kind: 'empty'
      total: string
      maxRows: string
    }

async function postJson<T>(
  url: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errorBody = body as { code?: string; message?: string } | null
    throw new ApiError(
      errorBody?.message ?? `HTTP ${response.status}`,
      response.status,
      errorBody?.code,
    )
  }

  if (!body || typeof body !== 'object') {
    throw new ApiError('Invalid response body', response.status)
  }

  return body as T
}

export async function fetchAlerts({
  page,
  pageSize,
  startTs,
  endTs,
  filters,
  signal,
}: FetchAlertsOptions): Promise<AlertPage> {
  const payload: {
    page: number
    page_size: number
    start_ts?: number
    end_ts?: number
    filters?: AlertFilter[]
  } = {
    page,
    page_size: pageSize,
  }

  if (startTs !== undefined) {
    payload.start_ts = startTs
  }
  if (endTs !== undefined) {
    payload.end_ts = endTs
  }
  if (filters && filters.length > 0) {
    payload.filters = filters
  }

  return postJson<AlertPage>('/api/v1/alerts', payload, signal)
}

export async function fetchAlertProtos({
  startTs,
  endTs,
  signal,
}: FetchOptions): Promise<AlertProtos> {
  return postJson<AlertProtos>(
    '/api/v1/alerts/protos',
    { start_ts: startTs, end_ts: endTs },
    signal,
  )
}

export async function fetchAlertCategories({
  startTs,
  endTs,
  signal,
}: FetchOptions): Promise<AlertCategories> {
  return postJson<AlertCategories>(
    '/api/v1/alerts/categories',
    { start_ts: startTs, end_ts: endTs },
    signal,
  )
}

export async function exportAlerts({
  startTs,
  endTs,
  filters,
  fields,
  locale,
  signal,
}: ExportAlertsOptions): Promise<AlertExportResult> {
  const payload: {
    start_ts: number
    end_ts: number
    filters?: AlertFilter[]
    fields: AlertExportField[]
    locale: AlertExportLocale
  } = {
    start_ts: startTs,
    end_ts: endTs,
    fields,
    locale,
  }

  if (filters.length > 0) {
    payload.filters = filters
  }

  const response = await fetch('/api/v1/alerts/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const errorBody = body as { code?: string; message?: string } | null

    throw new ApiError(
      errorBody?.message ?? `HTTP ${response.status}`,
      response.status,
      errorBody?.code,
    )
  }

  if (response.status === 204) {
    return {
      kind: 'empty',
      total: response.headers.get('X-Export-Total') ?? '0',
      maxRows: response.headers.get('X-Export-Max-Rows') ?? '0',
    }
  }

  return {
    kind: 'file',
    blob: await response.blob(),
    total: response.headers.get('X-Export-Total') ?? '0',
    exported: response.headers.get('X-Export-Exported') ?? '0',
    truncated: response.headers.get('X-Export-Truncated') === 'true',
    maxRows: response.headers.get('X-Export-Max-Rows') ?? '0',
  }
}
