const textDecoder = new TextDecoder('utf-8')

export function decodeBase64Text(value?: string | null): string {
  const raw = value?.trim()
  if (!raw) {
    return ''
  }

  try {
    const normalized = raw
      .replace(/\s+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const padding = (4 - (normalized.length % 4)) % 4
    const binary = atob(normalized + '='.repeat(padding))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return textDecoder.decode(bytes)
  } catch {
    return value ?? ''
  }
}
