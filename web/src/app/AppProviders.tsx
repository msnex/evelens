import { App as AntdApp, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import type { PropsWithChildren } from 'react'
import { I18nProvider, useI18n } from '../i18n/index.ts'
import { appTheme } from './theme.ts'

function AntdProviders({ children }: PropsWithChildren) {
  const { locale } = useI18n()

  return (
    <ConfigProvider locale={locale === 'zh-CN' ? zhCN : enUS} theme={appTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nProvider>
      <AntdProviders>{children}</AntdProviders>
    </I18nProvider>
  )
}
