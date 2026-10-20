import { DownOutlined } from '@ant-design/icons'
import { Button, DatePicker, Popover } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useI18n } from '../../i18n/index.ts'
import {
  TIME_RANGE_PRESETS,
  createPresetTimeRange,
  formatTimeRange,
  type TimeRangePreset,
  type TimeRangeValue,
} from './timeRange.ts'

const { RangePicker } = DatePicker

type TimeRangeFilterProps = {
  value: TimeRangeValue
  onChange: (value: TimeRangeValue) => void
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const rangeLabel = formatTimeRange(value)

  const closePanel = () => {
    setOpen(false)
    setPickerOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && pickerOpen) {
      return
    }
    setOpen(nextOpen)
  }

  const handlePresetClick = (preset: TimeRangePreset) => {
    onChange(createPresetTimeRange(preset))
    closePanel()
  }

  return (
    <div className="time-range-dock">
      <Popover
        content={
          <div className="time-range-panel">
            <div className="time-range-presets">
              {TIME_RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  block
                  size="small"
                  type={value.preset === preset.key ? 'primary' : 'text'}
                  onClick={() => handlePresetClick(preset.key)}
                >
                  {t(preset.labelKey)}
                </Button>
              ))}
            </div>

            <div className="time-range-picker">
              <RangePicker
                key={`${open}-${value.start}-${value.end}`}
                allowClear={false}
                classNames={{ popup: { root: 'time-range-picker-popup' } }}
                defaultValue={[dayjs(value.start), dayjs(value.end)]}
                format="YYYY-MM-DD HH:mm:ss"
                showTime={{ format: 'HH:mm:ss' }}
                onChange={(dates) => {
                  const start = dates?.[0]
                  const end = dates?.[1]

                  if (start && end) {
                    onChange({
                      start: start.millisecond(0).valueOf(),
                      end: end.millisecond(0).valueOf(),
                      preset: null,
                    })
                    closePanel()
                  }
                }}
                onOpenChange={setPickerOpen}
              />
            </div>
          </div>
        }
        arrow={false}
        destroyOnHidden
        open={open}
        placement="bottom"
        trigger="click"
        onOpenChange={handleOpenChange}
      >
        <button
          className="time-range-widget"
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${t('timeRange.label')}: ${rangeLabel}`}
          title={rangeLabel}
        >
          <span className="time-range-widget-range">{rangeLabel}</span>
          <DownOutlined
            className={`time-range-widget-arrow${open ? ' is-open' : ''}`}
          />
        </button>
      </Popover>
    </div>
  )
}
