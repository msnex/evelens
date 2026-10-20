import { GithubFilled, TranslationOutlined } from '@ant-design/icons'
import { Button, Layout, Menu, Tooltip } from 'antd'
import { useI18n } from '../i18n/index.ts'

const GITHUB_URL = 'https://github.com/msnex/evelens'

export function AppHeader() {
  const { locale, setLocale, t } = useI18n()

  const handleLanguageToggle = () => {
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return (
    <Layout.Header className="app-header">
      <a className="app-logo" href="/" aria-label="Evelens home">
        <img className="app-logo-icon" src="/evelens.svg" alt="" />
      </a>

      <Menu
        className="app-nav"
        mode="horizontal"
        theme="dark"
        selectedKeys={['alert-log']}
        items={[{ key: 'alert-log', label: t('menu.alerts') }]}
      />

      <div className="app-header-actions">
        <Tooltip title={t('language.label')} placement="bottom">
          <Button
            className="app-header-icon-button"
            type="text"
            icon={<TranslationOutlined />}
            onClick={handleLanguageToggle}
            aria-label={t('language.label')}
          />
        </Tooltip>

        <Tooltip title={t('github.label')} placement="bottom">
          <Button
            className="app-header-icon-button"
            type="text"
            icon={<GithubFilled />}
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('github.label')}
          />
        </Tooltip>
      </div>
    </Layout.Header>
  )
}
