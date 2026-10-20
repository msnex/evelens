import { SearchOutlined } from '@ant-design/icons'
import { App as AntdApp, Button, Input, InputNumber, Select, Tag } from 'antd'
import { Fragment, useState } from 'react'
import { useI18n } from '../../i18n/index.ts'
import type {
  AlertFilter,
  AlertFilterField,
  AlertFilterOperator,
} from '../../types/alert.ts'
import {
  ALERT_FILTER_FIELDS,
  MAX_ALERT_FILTERS,
  alertFilterKey,
  buildAlertFilter,
  formatAlertFilter,
  getFilterField,
  getFilterOperator,
  getFilterOperators,
  isMultiValueOperator,
  isSameAlertFilter,
  normalizeValues,
  type FilterOptionSource,
} from './filter.ts'

type AlertFilterBarProps = {
  filters: AlertFilter[]
  protoOptions: string[]
  appProtoOptions: string[]
  categoryOptions: string[]
  optionsLoading: boolean
  onSearch: (filter: AlertFilter | null) => boolean
  onRemove: (key: string) => void
}

export function AlertFilterBar({
  filters,
  protoOptions,
  appProtoOptions,
  categoryOptions,
  optionsLoading,
  onSearch,
  onRemove,
}: AlertFilterBarProps) {
  const { t } = useI18n()
  const { message } = AntdApp.useApp()
  const [field, setField] = useState<AlertFilterField>()
  const [operator, setOperator] = useState<AlertFilterOperator>()
  const [values, setValues] = useState<string[]>([])

  const fieldConfig = field ? getFilterField(field) : undefined
  const operatorOptions = field
    ? getFilterOperators(field).map((value) => ({
        value,
        label: t(getFilterOperator(value).labelKey),
      }))
    : []

  const handleFieldChange = (nextField: AlertFilterField | undefined) => {
    setField(nextField)
    setOperator(undefined)
    setValues([])
  }

  const handleOperatorChange = (nextOperator: AlertFilterOperator | undefined) => {
    const wasMulti = operator ? isMultiValueOperator(operator) : false
    const willMulti = nextOperator
      ? isMultiValueOperator(nextOperator)
      : false

    setOperator(nextOperator)
    if (nextOperator === undefined || wasMulti !== willMulti) {
      setValues([])
    }
  }

  const handleSearch = () => {
    const draft = buildAlertFilter(field, operator, values)

    if (draft.status === 'invalid') {
      message.error(t(draft.messageKey))
      return
    }

    if (draft.status === 'empty') {
      onSearch(null)
      return
    }

    if (filters.length >= MAX_ALERT_FILTERS) {
      const duplicate = filters.some((filter) =>
        isSameAlertFilter(filter, draft.filter),
      )
      if (!duplicate) {
        message.error(t('filter.limit'))
        return
      }
    }

    if (onSearch(draft.filter)) {
      setField(undefined)
      setOperator(undefined)
      setValues([])
    }
  }

  const renderValueInput = () => {
    if (!fieldConfig || !operator) {
      return <Input disabled placeholder={t('filter.valuePlaceholder')} />
    }

    const multi = isMultiValueOperator(operator)
    const placeholder = multi
      ? t('filter.multiValuePlaceholder')
      : fieldConfig.input === 'number'
        ? t('filter.portPlaceholder')
        : operator === 'match' || operator === 'not_match'
          ? t('filter.matchPlaceholder')
          : fieldConfig.input === 'ip'
            ? t('filter.ipPlaceholder')
            : t('filter.valuePlaceholder')

    if (fieldConfig.input === 'select') {
      const options = getOptionValues(
        fieldConfig.optionSource,
        protoOptions,
        appProtoOptions,
        categoryOptions,
      ).map((value) => ({ value, label: value }))

      if (multi) {
        return (
          <Select
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            className="alert-filter-control"
            loading={optionsLoading}
            options={options}
            placeholder={placeholder}
            value={values}
            onChange={(nextValues) => setValues(normalizeValues(nextValues))}
          />
        )
      }

      return (
        <Select
          allowClear
          showSearch
          className="alert-filter-control"
          loading={optionsLoading}
          options={options}
          placeholder={placeholder}
          value={values[0]}
          onChange={(value) => setValues(value ? [value] : [])}
        />
      )
    }

    if (multi) {
      return (
        <Select
          mode="tags"
          allowClear
          maxTagCount="responsive"
          tokenSeparators={[',', ' ']}
          className="alert-filter-control"
          placeholder={placeholder}
          value={values}
          onChange={(nextValues) => setValues(normalizeValues(nextValues))}
        />
      )
    }

    if (fieldConfig.input === 'number') {
      return (
        <InputNumber
          className="alert-filter-control"
          min={0}
          max={65535}
          precision={0}
          placeholder={placeholder}
          value={values[0] === undefined ? null : Number(values[0])}
          onChange={(value) =>
            setValues(value === null ? [] : [String(value)])
          }
        />
      )
    }

    return (
      <Input
        className="alert-filter-control"
        allowClear
        placeholder={placeholder}
        value={values[0] ?? ''}
        onChange={(event) =>
          setValues(event.target.value ? [event.target.value] : [])
        }
      />
    )
  }

  return (
    <div className="alert-filter-bar">
      <div className="alert-filter-editor">
        <Select<AlertFilterField>
          allowClear
          showSearch
          className="alert-filter-control"
          placeholder={t('filter.fieldPlaceholder')}
          options={ALERT_FILTER_FIELDS.map((item) => ({
            value: item.value,
            label: t(item.labelKey),
          }))}
          value={field}
          onChange={(value) => handleFieldChange(value)}
        />

        <Select<AlertFilterOperator>
          allowClear
          showSearch
          disabled={!field}
          className="alert-filter-control"
          placeholder={t('filter.operatorPlaceholder')}
          options={operatorOptions}
          value={operator}
          onChange={(value) => handleOperatorChange(value)}
        />

        <div className="alert-filter-value">{renderValueInput()}</div>

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
        >
          {t('filter.search')}
        </Button>
      </div>

      {filters.length > 0 && (
        <div className="alert-filter-applied">
          {filters.map((filter, index) => {
            const key = alertFilterKey(filter)
            const label = formatAlertFilter(filter, t)

            return (
              <Fragment key={key}>
                {index > 0 && (
                  <span className="alert-filter-and">{t('filter.and')}</span>
                )}
                <Tag
                  className="alert-filter-chip"
                  closable
                  title={label}
                  onClose={() => onRemove(key)}
                >
                  {label}
                </Tag>
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getOptionValues(
  source: FilterOptionSource | undefined,
  protoOptions: string[],
  appProtoOptions: string[],
  categoryOptions: string[],
): string[] {
  switch (source) {
    case 'proto':
      return protoOptions
    case 'app_proto':
      return appProtoOptions
    case 'category':
      return categoryOptions
    default:
      return []
  }
}
