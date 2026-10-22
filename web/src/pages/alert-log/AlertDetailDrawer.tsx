import { Button, Collapse, Drawer, Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/index.ts'
import type { AlertRow } from '../../types/alert.ts'
import { decodeBase64Text } from '../../utils/base64.ts'
import {
  formatAppProto,
  formatPort,
  formatText,
  formatTimestamp,
} from '../../utils/format.ts'
import { getSeverityOption } from '../../utils/severity.ts'

type AlertDetailDrawerProps = {
  alert: AlertRow | null
  canPrevious: boolean
  canNext: boolean
  navigation: 'previous' | 'next' | null
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
}

export function AlertDetailDrawer({
  alert,
  canPrevious,
  canNext,
  navigation,
  onPrevious,
  onNext,
  onClose,
}: AlertDetailDrawerProps) {
  const { t } = useI18n()
  const navigating = navigation !== null

  return (
    <Drawer
      rootClassName="alert-detail-drawer"
      destroyOnHidden
      mask={{ enabled: true, closable: true }}
      open={alert !== null}
      placement="right"
      defaultSize={960}
      resizable
      title={t('detail.title')}
      extra={
        <Space size={4} className="alert-detail-nav">
          <Button
            type="text"
            className="alert-detail-nav-button"
            disabled={!canPrevious || navigating}
            loading={navigation === 'previous'}
            onClick={onPrevious}
          >
            {t('detail.previous')}
          </Button>
          <Button
            type="text"
            className="alert-detail-nav-button"
            disabled={!canNext || navigating}
            loading={navigation === 'next'}
            onClick={onNext}
          >
            {t('detail.next')}
          </Button>
        </Space>
      }
      onClose={onClose}
    >
      {alert && <AlertDetailContent alert={alert} />}
    </Drawer>
  )
}

function AlertDetailContent({ alert }: { alert: AlertRow }) {
  const { t } = useI18n()
  const isHttp = alert.app_proto.trim().toLowerCase() === 'http'

  return (
    <div className="alert-detail-content">
      <DetailSection title={t('detail.section.alert')}>
        <div className="alert-detail-grid">
          <DetailField label={t('detail.field.signature')} wide>
            <EllipsisText value={alert.signature} />
          </DetailField>
          <DetailField label={t('detail.field.signatureId')}>
            {formatText(String(alert.signature_id))}
          </DetailField>
          <DetailField label={t('detail.field.category')}>
            <EllipsisText value={alert.category} />
          </DetailField>
          <DetailField label={t('detail.field.severity')}>
            <SeverityTag severity={alert.severity} />
          </DetailField>
          <DetailField label={t('detail.field.action')}>
            {formatText(alert.action)}
          </DetailField>
          <DetailField label={t('detail.field.timestamp')}>
            {formatTimestamp(alert.timestamp)}
          </DetailField>
          <DetailField label={t('detail.field.xff')}>
            <EllipsisText value={alert.xff} />
          </DetailField>
          <DetailField label={t('detail.field.rule')} wide>
            <Preformatted value={alert.rule} />
          </DetailField>
        </div>
      </DetailSection>

      <DetailSection title={t('detail.section.network')}>
        <div className="alert-detail-grid">
          <DetailField label={t('detail.field.srcMac')}>
            {formatText(alert.src_mac)}
          </DetailField>
          <DetailField label={t('detail.field.dstMac')}>
            {formatText(alert.dst_mac)}
          </DetailField>
          <DetailField label={t('detail.field.vlan')}>
            {alert.vlan?.length
              ? alert.vlan.join(', ')
              : t('detail.empty')}
          </DetailField>
          <DetailField label={t('detail.field.proto')}>
            {formatText(alert.proto)}
          </DetailField>
          <DetailField label={t('detail.field.srcIp')}>
            {formatText(alert.src_ip)}
          </DetailField>
          <DetailField label={t('detail.field.srcPort')}>
            {formatPort(alert.src_port)}
          </DetailField>
          <DetailField label={t('detail.field.dstIp')}>
            {formatText(alert.dst_ip)}
          </DetailField>
          <DetailField label={t('detail.field.dstPort')}>
            {formatPort(alert.dst_port)}
          </DetailField>
          <DetailField label={t('detail.field.appProto')} wide>
            {formatAppProto(alert.app_proto)}
          </DetailField>
        </div>
      </DetailSection>

      {isHttp && (
        <section className="alert-detail-section">
          <h3 className="alert-detail-section-title">
            {t('detail.section.http')}
          </h3>
          <div className="alert-detail-http-grid">
            <Collapse
              bordered
              defaultActiveKey={['request']}
              items={[
                {
                  key: 'request',
                  label: t('detail.http.request'),
                  children: <HttpRequestContent alert={alert} />,
                },
              ]}
              size="small"
            />
            <Collapse
              bordered
              defaultActiveKey={['response']}
              items={[
                {
                  key: 'response',
                  label: t('detail.http.response'),
                  children: <HttpResponseContent alert={alert} />,
                },
              ]}
              size="small"
            />
          </div>
        </section>
      )}

      <DetailSection title={t('detail.section.flow')}>
        <div className="alert-detail-grid">
          <DetailField label={t('detail.field.tsPkts')}>
            {formatText(alert.ts_pkts)}
          </DetailField>
          <DetailField label={t('detail.field.tsBytes')}>
            {formatText(alert.ts_bytes)}
          </DetailField>
          <DetailField label={t('detail.field.tcPkts')}>
            {formatText(alert.tc_pkts)}
          </DetailField>
          <DetailField label={t('detail.field.tcBytes')}>
            {formatText(alert.tc_bytes)}
          </DetailField>
          <DetailField label={t('detail.field.pktSrc')} wide>
            {formatText(alert.pkt_src)}
          </DetailField>
        </div>
      </DetailSection>
    </div>
  )
}

function SeverityTag({ severity }: { severity: AlertRow['severity'] }) {
  const { t } = useI18n()
  const option = getSeverityOption(severity)
  return <Tag color={option.color}>{t(option.labelKey)}</Tag>
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="alert-detail-section">
      <h3 className="alert-detail-section-title">{title}</h3>
      {children}
    </section>
  )
}

function DetailField({
  label,
  children,
  wide = false,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`alert-detail-field${wide ? ' alert-detail-field--wide' : ''}`}
    >
      <div className="alert-detail-field-label">{label}</div>
      <div className="alert-detail-field-value">{children}</div>
    </div>
  )
}

function HttpRequestContent({ alert }: { alert: AlertRow }) {
  const { t } = useI18n()
  const requestLine = [alert.http_method, alert.http_url, alert.http_protocol]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ')

  return (
    <div className="alert-detail-http-content">
      <HttpBlock title={t('detail.http.requestLine')} value={requestLine} />
      <HttpBlock
        title={t('detail.http.requestHeaders')}
        value={decodeBase64Text(alert.http_req_hdr)}
      />
      <HttpBlock
        title={t('detail.http.requestBody')}
        value={decodeBase64Text(alert.http_req_body)}
      />
    </div>
  )
}

function HttpResponseContent({ alert }: { alert: AlertRow }) {
  const { t } = useI18n()

  return (
    <div className="alert-detail-http-content">
      <HttpBlock
        title={t('detail.http.responseLine')}
        value={alert.http_resp_line}
      />
      <HttpBlock
        title={t('detail.http.responseHeaders')}
        value={decodeBase64Text(alert.http_resp_hdr)}
      />
      <HttpBlock
        title={t('detail.http.responseBody')}
        value={decodeBase64Text(alert.http_resp_body)}
      />
    </div>
  )
}

function HttpBlock({ title, value }: { title: string; value?: string }) {
  return (
    <div className="alert-detail-http-block">
      <div className="alert-detail-http-block-title">{title}</div>
      <Preformatted value={value} />
    </div>
  )
}

function EllipsisText({ value }: { value?: string | null }) {
  const text = formatText(value)

  if (text === '--') {
    return <>{text}</>
  }

  return (
    <Typography.Text
      className="alert-detail-ellipsis"
      ellipsis={{ tooltip: text }}
    >
      {text}
    </Typography.Text>
  )
}

function Preformatted({ value }: { value?: string }) {
  const { t } = useI18n()
  const content = value?.trim() ? value : t('detail.empty')
  return <pre className="alert-detail-pre">{content}</pre>
}
