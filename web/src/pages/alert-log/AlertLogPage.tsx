import { App as AntdApp, Button, Empty, Table, Tag, Tooltip } from 'antd'
import type { TablePaginationConfig, TableProps } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAlertCategories,
  fetchAlertProtos,
  fetchAlerts,
} from '../../api/alerts.ts'
import { useI18n } from '../../i18n/index.ts'
import type {
  AlertFilter,
  AlertPage,
  AlertRow,
  AlertSeverity,
} from '../../types/alert.ts'
import {
  formatAppProto,
  formatCount,
  formatPort,
  formatText,
  formatTimestamp,
} from '../../utils/format.ts'
import { getSeverityOption } from '../../utils/severity.ts'
import { AlertDetailDrawer } from './AlertDetailDrawer.tsx'
import { AlertExportDialog } from './AlertExportDialog.tsx'
import { AlertFilterBar } from './AlertFilterBar.tsx'
import { alertFilterKey, isSameAlertFilter } from './filter.ts'
import { TimeRangeFilter } from './TimeRangeFilter.tsx'
import {
  createPresetTimeRange,
  isSameTimeRange,
  refreshPresetTimeRange,
  type TimeRangeValue,
} from './timeRange.ts'
import { useTableBodyHeight } from './useTableBodyHeight.ts'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function emptyPage(page: number, pageSize: number): AlertPage {
  return {
    total: '0',
    page,
    page_size: pageSize,
    items: [],
  }
}

function parseTotal(value: string): bigint {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

export function AlertLogPage() {
  const { locale, t } = useI18n()
  const { message } = AntdApp.useApp()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [data, setData] = useState<AlertPage>(() =>
    emptyPage(DEFAULT_PAGE, DEFAULT_PAGE_SIZE),
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [filters, setFilters] = useState<AlertFilter[]>([])
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null)
  const [exportSnapshot, setExportSnapshot] = useState<{
    range: TimeRangeValue
    filters: AlertFilter[]
  } | null>(null)
  const [navigation, setNavigation] = useState<
    'previous' | 'next' | null
  >(null)
  const [protoOptions, setProtoOptions] = useState<string[]>([])
  const [appProtoOptions, setAppProtoOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [range, setRange] = useState<TimeRangeValue>(() =>
    createPresetTimeRange('lastHour'),
  )
  const { containerRef, bodyHeight } = useTableBodyHeight(
    `${locale}:${pageSize}:${data.total}:${loadError ? 'error' : 'data'}:${loading ? 'loading' : 'idle'}:${filters.length}`,
  )
  const tRef = useRef(t)
  const navigationAbortRef = useRef<AbortController | null>(null)
  const skipPageFetchRef = useRef<number | null>(null)

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(
    () => () => {
      navigationAbortRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    Promise.allSettled([
      fetchAlertProtos({
        startTs: range.start,
        endTs: range.end,
        signal: controller.signal,
      }),
      fetchAlertCategories({
        startTs: range.start,
        endTs: range.end,
        signal: controller.signal,
      }),
    ])
      .then(([protosResult, categoriesResult]) => {
        if (!active) {
          return
        }

        let failed = false

        if (protosResult.status === 'fulfilled') {
          setProtoOptions(protosResult.value.proto)
          setAppProtoOptions(protosResult.value.app_proto)
        } else if (!isAbortError(protosResult.reason)) {
          failed = true
          console.error(
            'Failed to load alert proto options',
            protosResult.reason,
          )
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategoryOptions(categoriesResult.value.category)
        } else if (!isAbortError(categoriesResult.reason)) {
          failed = true
          console.error(
            'Failed to load alert category options',
            categoriesResult.reason,
          )
        }

        if (failed) {
          message.error(tRef.current('filter.optionsLoadError'))
        }
      })
      .finally(() => {
        if (active) {
          setOptionsLoading(false)
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [message, range.end, range.start])

  useEffect(() => {
    if (skipPageFetchRef.current === page) {
      skipPageFetchRef.current = null
      return
    }

    const controller = new AbortController()
    let active = true

    fetchAlerts({
      page,
      pageSize,
      startTs: range.start,
      endTs: range.end,
      filters,
      signal: controller.signal,
    })
      .then((response) => {
        if (active) {
          setData(response)
          setLoadError(false)
        }
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) {
          return
        }

        console.error('Failed to load alerts', error)
        setData(emptyPage(page, pageSize))
        setLoadError(true)
        message.error(t('alerts.loadError'))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [
    filters,
    message,
    page,
    pageSize,
    range.end,
    range.start,
    reloadToken,
    t,
  ])

  const handleOpenAlert = useCallback((alert: AlertRow) => {
    navigationAbortRef.current?.abort()
    navigationAbortRef.current = null
    setNavigation(null)
    setSelectedAlert(alert)
  }, [])

  const columns = useMemo<TableProps<AlertRow>['columns']>(
    () => [
      {
        title: t('columns.index'),
        key: 'index',
        width: 70,
        align: 'center',
        render: (_value, _record, index) =>
          (page - 1) * pageSize + index + 1,
      },
      {
        title: t('columns.signature'),
        dataIndex: 'signature',
        key: 'signature',
        width: 240,
        render: (value: string) => (
          <Tooltip title={value} placement="topLeft">
            <span className="alert-signature-text">{value}</span>
          </Tooltip>
        ),
      },
      {
        title: t('columns.severity'),
        dataIndex: 'severity',
        key: 'severity',
        width: 100,
        render: (value: AlertSeverity) => {
          const severity = getSeverityOption(value)
          return <Tag color={severity.color}>{t(severity.labelKey)}</Tag>
        },
      },
      {
        title: t('columns.srcIp'),
        dataIndex: 'src_ip',
        key: 'src_ip',
        width: 150,
        ellipsis: { showTitle: true },
        render: (value: string) => formatText(value),
      },
      {
        title: t('columns.dstIp'),
        dataIndex: 'dst_ip',
        key: 'dst_ip',
        width: 150,
        ellipsis: { showTitle: true },
        render: (value: string) => formatText(value),
      },
      {
        title: t('columns.srcPort'),
        dataIndex: 'src_port',
        key: 'src_port',
        width: 130,
        render: (value: number) => formatPort(value),
      },
      {
        title: t('columns.dstPort'),
        dataIndex: 'dst_port',
        key: 'dst_port',
        width: 140,
        render: (value: number) => formatPort(value),
      },
      {
        title: t('columns.proto'),
        dataIndex: 'proto',
        key: 'proto',
        width: 90,
        render: (value: string) => formatText(value),
      },
      {
        title: t('columns.appProto'),
        dataIndex: 'app_proto',
        key: 'app_proto',
        width: 120,
        render: (value: string) => formatAppProto(value),
      },
      {
        title: t('columns.timestamp'),
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 200,
        render: (value: string) => formatTimestamp(value),
      },
      {
        title: t('columns.action'),
        key: 'actions',
        width: 90,
        fixed: 'right',
        render: (_value, record) => (
          <Button
            size="small"
            type="link"
            onClick={() => handleOpenAlert(record)}
          >
            {t('detail.view')}
          </Button>
        ),
      },
    ],
    [handleOpenAlert, page, pageSize, t],
  )

  const totalValue = parseTotal(data.total)
  const totalPages =
    totalValue > 0n
      ? Number((totalValue + BigInt(pageSize) - 1n) / BigInt(pageSize))
      : 0
  const paginationTotal =
    totalValue <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(totalValue)
      : Number.MAX_SAFE_INTEGER

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: paginationTotal,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showQuickJumper: true,
    showTotal: () =>
      t('pagination.total').replace(
        '{total}',
        formatCount(data.total, locale),
      ),
    responsive: false,
  }

  const handleTableChange: TableProps<AlertRow>['onChange'] = (
    nextPagination,
  ) => {
    const nextPageSize = nextPagination.pageSize ?? pageSize

    if (nextPageSize !== pageSize) {
      setLoading(true)
      setLoadError(false)
      setPageSize(nextPageSize)
      setPage(DEFAULT_PAGE)
      return
    }

    const nextPage = nextPagination.current ?? DEFAULT_PAGE
    if (nextPage !== page) {
      setLoading(true)
      setLoadError(false)
      setPage(nextPage)
    }
  }

  const selectedAlertIndex = selectedAlert
    ? data.items.findIndex((item) => item.id === selectedAlert.id)
    : -1
  const canPreviousAlert =
    selectedAlert !== null &&
    (selectedAlertIndex > 0 || page > DEFAULT_PAGE)
  const canNextAlert =
    selectedAlert !== null &&
    ((selectedAlertIndex >= 0 &&
      selectedAlertIndex < data.items.length - 1) ||
      page < totalPages)

  const goToAdjacentAlert = async (direction: -1 | 1) => {
    if (!selectedAlert || navigation !== null || navigationAbortRef.current) {
      return
    }

    const currentIndex = data.items.findIndex(
      (item) => item.id === selectedAlert.id,
    )
    const targetIndex = currentIndex >= 0 ? currentIndex + direction : -1

    if (targetIndex >= 0 && targetIndex < data.items.length) {
      setSelectedAlert(data.items[targetIndex])
      return
    }

    const targetPage = page + direction
    if (targetPage < DEFAULT_PAGE || targetPage > totalPages) {
      return
    }

    const controller = new AbortController()
    navigationAbortRef.current = controller
    setNavigation(direction > 0 ? 'next' : 'previous')

    try {
      const response = await fetchAlerts({
        page: targetPage,
        pageSize,
        startTs: range.start,
        endTs: range.end,
        filters,
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return
      }

      const target =
        direction > 0
          ? response.items[0]
          : response.items[response.items.length - 1]

      if (!target) {
        message.error(t('detail.navigationError'))
        return
      }

      skipPageFetchRef.current = targetPage
      setData(response)
      setLoadError(false)
      setPage(targetPage)
      setSelectedAlert(target)
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Failed to switch alert', error)
        message.error(t('detail.navigationError'))
      }
    } finally {
      if (navigationAbortRef.current === controller) {
        navigationAbortRef.current = null
        setNavigation(null)
      }
    }
  }

  const handleCloseAlert = () => {
    navigationAbortRef.current?.abort()
    navigationAbortRef.current = null
    setNavigation(null)
    setSelectedAlert(null)
  }

  const handleRetry = () => {
    setLoading(true)
    setLoadError(false)
    setReloadToken((token) => token + 1)
  }

  const handleRangeChange = (nextRange: TimeRangeValue) => {
    if (isSameTimeRange(range, nextRange)) {
      setRange(nextRange)
      return
    }

    setLoading(true)
    setLoadError(false)
    setOptionsLoading(true)
    setPage(DEFAULT_PAGE)
    setRange(nextRange)
  }

  const handleSearch = (newFilter: AlertFilter | null) => {
    const nextRange = refreshPresetTimeRange(range)
    const rangeChanged = !isSameTimeRange(range, nextRange)
    const filterAdded =
      newFilter !== null &&
      !filters.some((filter) => isSameAlertFilter(filter, newFilter))

    if (!rangeChanged && !filterAdded) {
      return true
    }

    if (filterAdded && newFilter) {
      setFilters((current) => [...current, newFilter])
    }

    setLoading(true)
    setLoadError(false)

    if (rangeChanged) {
      setOptionsLoading(true)
      setRange(nextRange)
    }

    setPage(DEFAULT_PAGE)
    return true
  }

  const handleRemoveFilter = (key: string) => {
    setLoading(true)
    setLoadError(false)
    setPage(DEFAULT_PAGE)
    setFilters((current) =>
      current.filter((filter) => alertFilterKey(filter) !== key),
    )
  }

  const handleOpenExport = () => {
    setExportSnapshot({
      range: { ...range },
      filters: filters.map((filter) => ({
        ...filter,
        values: [...filter.values],
      })),
    })
  }

  const emptyText = loadError ? (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={t('alerts.loadError')}
    >
      <Button type="primary" onClick={handleRetry}>
        {t('alerts.retry')}
      </Button>
    </Empty>
  ) : (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={t('alerts.empty')}
    />
  )

  return (
    <div className="alert-page">
      <TimeRangeFilter value={range} onChange={handleRangeChange} />
      <AlertFilterBar
        filters={filters}
        protoOptions={protoOptions}
        appProtoOptions={appProtoOptions}
        categoryOptions={categoryOptions}
        optionsLoading={optionsLoading}
        onSearch={handleSearch}
        onExport={handleOpenExport}
        onRemove={handleRemoveFilter}
      />
      <div className="alert-table-shell">
        <div className="alert-table-region" ref={containerRef}>
          <Table<AlertRow>
            className="alert-table"
            bordered={false}
            columns={columns}
            dataSource={data.items}
            loading={loading}
            locale={{ emptyText }}
            onChange={handleTableChange}
            pagination={pagination}
            rowKey="id"
            scroll={{ x: 1490, y: bodyHeight }}
            size="medium"
            tableLayout="fixed"
          />
        </div>
      </div>
      <AlertDetailDrawer
        alert={selectedAlert}
        canPrevious={canPreviousAlert}
        canNext={canNextAlert}
        navigation={navigation}
        onPrevious={() => {
          void goToAdjacentAlert(-1)
        }}
        onNext={() => {
          void goToAdjacentAlert(1)
        }}
        onClose={handleCloseAlert}
      />
      {exportSnapshot && (
        <AlertExportDialog
          filters={exportSnapshot.filters}
          range={exportSnapshot.range}
          onClose={() => setExportSnapshot(null)}
        />
      )}
    </div>
  )
}
