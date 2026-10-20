import { useEffect, useRef, useState } from 'react'

const MIN_BODY_HEIGHT = 120
const INITIAL_BODY_HEIGHT = 480

export function useTableBodyHeight(resetKey: number | string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [bodyHeight, setBodyHeight] = useState(INITIAL_BODY_HEIGHT)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let frame = 0

    const measure = () => {
      const headerHeight =
        container
          .querySelector<HTMLElement>('.ant-table-thead')
          ?.getBoundingClientRect().height ?? 39
      const pagination = container.querySelector<HTMLElement>(
        '.ant-table-pagination',
      )
      const paginationHeight = pagination
        ? pagination.getBoundingClientRect().height + 24
        : 56
      const available =
        container.clientHeight - headerHeight - paginationHeight

      setBodyHeight(Math.max(MIN_BODY_HEIGHT, Math.floor(available)))
    }

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    scheduleMeasure()

    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(container)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [resetKey])

  return { containerRef, bodyHeight }
}
