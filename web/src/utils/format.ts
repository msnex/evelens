const pad = (value: number, length = 2) =>
  value.toString().padStart(length, '0')

export function formatCount(value: string, locale: string): string {
  try {
    return BigInt(value).toLocaleString(locale)
  } catch {
    return value
  }
}

export function formatTimestamp(value: string): string {
  if (!value) {
    return '--'
  }

  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) {
    return '--'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
  ].join(' ')
}

export function formatAppProto(value?: string | null): string {
  if (!value) {
    return '--'
  }

  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'failed' ? '--' : value
}

export function formatText(value?: string | null): string {
  const text = value?.trim()
  return text ? text : '--'
}

export function formatPort(value?: number | null): string {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return '--'
  }

  return String(value)
}
