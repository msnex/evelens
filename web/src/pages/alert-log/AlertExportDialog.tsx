import { Alert, App as AntdApp, Modal, Tag, Transfer } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import { ApiError, exportAlerts } from '../../api/alerts.ts'
import { useI18n } from '../../i18n/index.ts'
import type { AlertExportField, AlertFilter } from '../../types/alert.ts'
import { formatCount } from '../../utils/format.ts'
import { alertFilterKey, formatAlertFilter } from './filter.ts'
import {
  ALERT_EXPORT_FIELDS,
  buildAlertExportFilename,
  downloadBlob,
} from './export.ts'
import { formatTimeRange, type TimeRangeValue } from './timeRange.ts'

type ExportFieldItem = {
  key: AlertExportField
  title: string
}

type AlertExportDialogProps = {
  range: TimeRangeValue
  filters: AlertFilter[]
  onClose: () => void
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

export function AlertExportDialog({
  range,
  filters,
  onClose,
}: AlertExportDialogProps) {
  const { locale, t } = useI18n()
  const { message, notification } = AntdApp.useApp()
  const [targetKeys, setTargetKeys] = useState<Key[]>([])
  const [exporting, setExporting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  const fieldItems = useMemo<ExportFieldItem[]>(
    () =>
      ALERT_EXPORT_FIELDS.map((field) => ({
        key: field.value,
        title: t(field.labelKey),
      })),
    [t],
  )

  const handleCancel = () => {
    if (!exporting) {
      onClose()
    }
  }

  const handleExport = async () => {
    if (targetKeys.length === 0) {
      message.warning(t('export.fieldsRequired'))
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setExporting(true)

    try {
      const result = await exportAlerts({
        startTs: range.start,
        endTs: range.end,
        filters,
        fields: targetKeys.map((key) => String(key) as AlertExportField),
        locale,
        signal: controller.signal,
      })

      if (result.kind === 'empty') {
        notification.warning({
          title: t('export.title'),
          description: t('export.emptyNotice'),
          duration: 5,
        })
        setExporting(false)
        onClose()
        return
      }

      downloadBlob(result.blob, buildAlertExportFilename(range))

      if (result.truncated) {
        notification.warning({
          title: t('export.title'),
          description: t('export.truncatedNotice')
            .replace('{total}', formatCount(result.total, locale))
            .replace('{exported}', formatCount(result.exported, locale)),
          duration: 5,
        })
      } else {
        message.success(t('export.success'))
      }

      setExporting(false)
      onClose()
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      console.error('Failed to export alerts', error)
      if (error instanceof ApiError && error.code === '4009') {
        message.error(t('export.fieldsRequired'))
      } else {
        message.error(t('export.failed'))
      }
      setExporting(false)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  return (
    <Modal
      className="alert-export-modal"
      destroyOnHidden
      cancelButtonProps={{ disabled: exporting }}
      closable={!exporting}
      confirmLoading={exporting}
      keyboard={!exporting}
      mask={{ enabled: true, closable: !exporting }}
      okButtonProps={{ disabled: targetKeys.length === 0 }}
      okText={t('export.confirm')}
      open
      title={t('export.title')}
      width={920}
      onCancel={handleCancel}
      onOk={() => {
        void handleExport()
      }}
    >
      <div className="alert-export-content">
        <div className="alert-export-summary">
          <span className="alert-export-summary-label">
            {t('export.timeRange')}
          </span>
          <span className="alert-export-summary-value">
            {formatTimeRange(range)}
          </span>

          <span className="alert-export-summary-label">
            {t('export.filters')}
          </span>
          <div className="alert-export-summary-value alert-export-filters">
            {filters.length > 0 ? (
              filters.map((filter) => (
                <Tag key={alertFilterKey(filter)}>
                  {formatAlertFilter(filter, t)}
                </Tag>
              ))
            ) : (
              <span>{t('export.noFilters')}</span>
            )}
          </div>
        </div>

        <Alert
          className="alert-export-hint"
          showIcon
          title={t('export.limitHint')}
          type="info"
        />

        <Transfer<ExportFieldItem>
          className="alert-export-transfer"
          dataSource={fieldItems}
          oneWay
          render={(item) => item.title}
          showSearch
          targetKeys={targetKeys}
          titles={[t('export.availableFields'), t('export.selectedFields')]}
          onChange={(nextKeys) => setTargetKeys(nextKeys)}
        />
      </div>
    </Modal>
  )
}
