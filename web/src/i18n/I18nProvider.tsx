import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'
import { I18nContext } from './context.ts'
import { messages, type Locale, type MessageKey } from '../locales/index.ts'

const STORAGE_KEY = 'evelens.locale'

function getInitialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-CN' || stored === 'en-US') {
      return stored
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }

  const preferredLanguage =
    navigator.languages?.[0] ?? navigator.language ?? ''

  return preferredLanguage.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN'
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
  }, [])

  const t = useCallback(
    (key: MessageKey) => messages[locale][key],
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
