import { useState } from 'react'
import { curvePath, labelPos, computeBends, getEpsStyle, STATE_RADIUS } from '../utils/svgHelpers'
import { computeViewBox } from '../utils/layout'

const R = STATE_RADIUS

// Human-readable role descriptions for the tooltip
const ROLE_DESC = {
  'entry':   'entry — enter loop body',
  'entry-1': 'entry 1 — branch into option 1',
  'entry-2': 'entry 2 — branch into option 2',
  'skip':    'skip — bypass body (zero times)',
  'loop':    'loop — repeat from start',
  'exit':    'exit — leave construct',
  'bridge':  'bridge — connect sub-expressions',
  'join':    'join — merge union branches',
}

/**
 * AutomatonSVG.jsx
 * Declarative SVG renderer for NFA and DFA graphs.
 * ε-transitions are coloured and styled by their semantic role.
 * Hovering an ε edge shows a tooltip with its role description.
 */
export default function AutomatonSVG({ states, transitions, pos, startId, acceptIds, isDFA, highlightPath, svgRef, newestStateId }) {
  const [tooltip, setTooltip] = useState(null) // { x, y, text }

  const accentColor = isDFA ? '#3a5a8c' : '#2d6a4f'
  const markerId    = isDFA ? 'dfa' : 'nfa'
  const viewBox     = computeViewBox(pos)
  const bends       = computeBends(transitions)

  // Collect all unique ε stroke colours to generate one arrowhead marker per colour
  const epsMarkers = isDFA ? [] : (() => {
    const seen = new Set()
    return transitions
      .filter(t => t.symbol === 'ε')
      .map(t => getEpsStyle(t)?.stroke)
      .filter(c => c && !seen.has(c) && seen.add(c))
  })()

  const handleEpsMove = (e, role) => {
    const svgEl = svgRef?.current
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const vb   = svgEl.getAttribute('viewBox')?.split(' ').map(Number)
    if (!vb) return
    const scaleX = vb[2] / rect.width
    const scaleY = vb[3] / rect.height
    const svgX = vb[0] + (e.clientX - rect.left) * scaleX
    const svgY = vb[1] + (e.clientY - rect.top)  * scaleY
    const desc = ROLE_DESC[role] ?? (role ? `ε (${role})` : 'ε-transition')
    setTooltip({ x: svgX, y: svgY - 18, text: desc })
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full min-w-[480px] md:min-w-0 cursor-default"
      onMouseLeave={() => setTooltip(null)}
    >
      <defs>
        {/* Default arrowhead (symbol transitions) */}
        <marker id={`arr-${markerId}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9a9a8a" />
        </marker>

        {/* Start-state arrowhead */}
        <marker id={`arr-start-${markerId}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={accentColor} />
        </marker>

        {/* One arrowhead marker per unique ε colour */}
        {epsMarkers.map(color => (
          <marker
            key={color}
            id={`arr-eps-${color.replace('#', '')}-${markerId}`}
            markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={color} />
          </marker>
        ))}
      </defs>

      {/* ── Start arrow ── */}
      {pos[startId] && (
        <line
          x1={pos[startId].x - R - 35} y1={pos[startId].y}
          x2={pos[startId].x - R - 4}  y2={pos[startId].y}
          stroke={accentColor}
          strokeWidth="2"
          markerEnd={`url(#arr-start-${markerId})`}
        />
      )}

      {/* ── Transition edges ── */}
      {transitions.map((t, i) => {
        const p1 = pos[t.from], p2 = pos[t.to]
        if (!p1 || !p2) return null

        const bend     = bends[i]
        const epsStyle = getEpsStyle(t)
        const isEps    = !!epsStyle
        const isHL     = highlightPath?.includes(t.from) && highlightPath?.includes(t.to)
        const lp       = labelPos(p1.x, p1.y, p2.x, p2.y, bend)

        const stroke    = isHL ? '#2d6a4f' : isEps ? epsStyle.stroke : '#b0aa9a'
        const dashArray = isEps ? epsStyle.dash : undefined
        const arrowId   = isEps
          ? `arr-eps-${epsStyle.stroke.replace('#', '')}-${markerId}`
          : `arr-${markerId}`

        return (
          <g
            key={i}
            style={{ cursor: isEps ? 'help' : 'default' }}
            onMouseEnter={isEps ? (e) => handleEpsMove(e, t.role) : undefined}
            onMouseMove={isEps  ? (e) => handleEpsMove(e, t.role) : undefined}
            onMouseLeave={isEps ? () => setTooltip(null)           : undefined}
          >
            {/* Wide invisible hit area for easy hover on thin ε arcs */}
            {isEps && (
              <path
                d={curvePath(p1.x, p1.y, p2.x, p2.y, bend)}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
              />
            )}
            <path
              d={curvePath(p1.x, p1.y, p2.x, p2.y, bend)}
              fill="none"
              stroke={stroke}
              strokeWidth={isHL ? 2.5 : 1.5}
              strokeDasharray={dashArray}
              opacity={isEps ? 0.82 : 1}
              markerEnd={`url(#${arrowId})`}
            />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle"
              fill={stroke}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {t.symbol}
            </text>
          </g>
        )
      })}

      {/* ── States ── */}
      {states.map((s) => {
        const p = pos[s.id]
        if (!p) return null

        const isAccept = acceptIds.has(s.id)
        const isHL     = highlightPath?.[highlightPath.length - 1] === s.id
        const isNewest = newestStateId != null && s.id === newestStateId
        const stroke   = isAccept || s.isStart ? accentColor : '#b0aa9a'
        const fill     = isHL     ? (isDFA ? '#dde6f5' : '#d8ede4')
                       : isNewest ? (isDFA ? '#c8d9f0' : '#c2e4d0')
                       : '#ffffff'

        return (
          <g key={s.id} style={isNewest ? { animation: 'state-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' } : undefined}>
            <circle
              cx={p.x} cy={p.y} r={R}
              fill={fill}
              stroke={isNewest ? accentColor : (isHL ? accentColor : stroke)}
              strokeWidth={isNewest ? 3 : (s.isStart ? 2.5 : 2)}
            />
            {isAccept && (
              <circle
                cx={p.x} cy={p.y} r={R - 5}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
              />
            )}
            <text
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1e1c18"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.label}
            </text>
          </g>
        )
      })}

      {/* ── Animation keyframes ── */}
      <defs>
        <style>{'@keyframes state-pop { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }'}</style>
      </defs>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltip.x - 4}
            y={tooltip.y - 14}
            width={tooltip.text.length * 6.4 + 10}
            height={19}
            rx="3" ry="3"
            fill="rgba(30,28,24,0.85)"
          />
          <text
            x={tooltip.x + 1} y={tooltip.y}
            fill="#f5f4f0"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fontWeight="600"
          >
            {tooltip.text}
          </text>
        </g>
      )}
    </svg>
  )
}