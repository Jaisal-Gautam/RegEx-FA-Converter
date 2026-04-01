import { useEffect, useCallback } from 'react'

/**
 * usePanZoom
 * Attaches mouse-drag pan and scroll-wheel zoom listeners to an SVG ref.
 *
 * @param {React.RefObject<SVGSVGElement>} svgRef
 * @returns {{ zoomBy: (factor: number) => void }}
 */
export function usePanZoom(svgRef) {
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let dragging = false
    let lastX = 0, lastY = 0

    const onMouseDown = (e) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseMove = (e) => {
      if (!dragging) return
      const vb = svg.getAttribute('viewBox')
      if (!vb) return
      const [x, y, w, h] = vb.split(' ').map(Number)
      const rect = svg.getBoundingClientRect()
      const dx = (e.clientX - lastX) * w / rect.width
      const dy = (e.clientY - lastY) * h / rect.height
      svg.setAttribute('viewBox', `${x - dx} ${y - dy} ${w} ${h}`)
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseUp = () => { dragging = false }

    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const vb = svg.getAttribute('viewBox')
      if (!vb) return
      const [x, y, w, h] = vb.split(' ').map(Number)
      const cx = x + w / 2, cy = y + h / 2
      const nw = w / factor, nh = h / factor
      svg.setAttribute('viewBox', `${cx - nw / 2} ${cy - nh / 2} ${nw} ${nh}`)
    }

    svg.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    svg.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      svg.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      svg.removeEventListener('wheel', onWheel)
    }
  }, [svgRef])

  /** Zoom in (factor > 1) or out (factor < 1) around the viewport centre. */
  const zoomBy = useCallback((factor) => {
    const svg = svgRef.current
    if (!svg) return
    const vb = svg.getAttribute('viewBox')
    if (!vb) return
    const [x, y, w, h] = vb.split(' ').map(Number)
    const cx = x + w / 2, cy = y + h / 2
    const nw = w / factor, nh = h / factor
    svg.setAttribute('viewBox', `${cx - nw / 2} ${cy - nh / 2} ${nw} ${nh}`)
  }, [svgRef])

  return { zoomBy }
}
