import { useState, useMemo } from 'react'
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
 * Features:
 * - 3-layer rendering (Edges -> States -> Labels) for textbook clarity.
 * - Pill Badges for transition labels to ensure readability.
 * - Smart merged labels (e.g., 'a, b') for parallel edges.
 */
export default function AutomatonSVG({ states, transitions, pos, startId, acceptIds, isDFA, highlightPath, svgRef, newestStateId, darkMode, newStateIds, newTransKeys, animKey, activeNodeIds, activeTransKeys }) {
  const [tooltip, setTooltip] = useState(null) // { x, y, text }

  const accentColor = isDFA ? '#3a5a8c' : '#2d6a4f'
  const markerId    = isDFA ? 'dfa' : 'nfa'
  const viewBox     = computeViewBox(pos)

  // Merge transitions sharing same from/to states
  const mergedTransitions = useMemo(() => {
    const groups = {}
    transitions.forEach(t => {
      const key = `${t.from}-${t.to}`
      if (!groups[key]) {
        groups[key] = { ...t, originalSymbols: new Set() }
      }
      groups[key].originalSymbols.add(t.symbol)
    })
    return Object.values(groups).map(t => {
      const symbols = Array.from(t.originalSymbols).sort()
      return {
        ...t,
        symbol: symbols.join(', '),
        originalSymbols: symbols
      }
    })
  }, [transitions])

  const bends = computeBends(mergedTransitions)

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
      className="w-full h-full min-w-[480px] md:min-w-0 cursor-default transition-all duration-300"
      onMouseLeave={() => setTooltip(null)}
    >
      <defs>
        <marker id={`arr-${markerId}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9a9a8a" />
        </marker>
        <marker id={`arr-start-${markerId}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={accentColor} />
        </marker>
        {epsMarkers.map(color => (
          <marker
            key={color}
            id={`arr-eps-${color.replace('#', '')}-${markerId}`}
            markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={color} />
          </marker>
        ))}
        {/* Dimmed markers for faded states */}
        <marker id={`arr-dim-${markerId}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#cccccc" />
        </marker>
        {epsMarkers.map(color => (
          <marker
            key={'dim-'+color}
            id={`arr-eps-dim-${color.replace('#', '')}-${markerId}`}
            markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={`${color}44`} />
          </marker>
        ))}
      </defs>

      {/* ── Start arrow ── */}
      {pos[startId] && (() => {
        const isDim = activeNodeIds && !activeNodeIds.has(startId)
        return (
          <line
            x1={pos[startId].x - R - 35} y1={pos[startId].y}
            x2={pos[startId].x - R - 4}  y2={pos[startId].y}
            stroke={isDim ? '#cccccc' : accentColor}
            strokeWidth="2"
            opacity={isDim ? 0.3 : 1}
            markerEnd={isDim ? `url(#arr-dim-${markerId})` : `url(#arr-start-${markerId})`}
          />
        )
      })()}

      {/* ── Layer 1: Transition Edge Paths ── */}
      {mergedTransitions.map((t, i) => {
        const p1 = pos[t.from], p2 = pos[t.to]
        if (!p1 || !p2) return null

        const bend = bends[i]
        const epsStyle = getEpsStyle(t)
        const isEps = !!epsStyle
        const isHL = highlightPath?.includes(t.from) && highlightPath?.includes(t.to)
        
        const isEdgeDim = activeTransKeys 
          ? !t.originalSymbols?.some(sym => activeTransKeys.has(`${t.from}-${t.to}-${sym}`))
          : (activeNodeIds && (!activeNodeIds.has(t.from) || !activeNodeIds.has(t.to)))

        const stroke = isHL ? '#2d6a4f' : isEps ? epsStyle.stroke : '#b0aa9a'
        const dashArray = isEps ? epsStyle.dash : (isEdgeDim ? '4,4' : undefined)
        
        const arrowId = isEps 
          ? (isEdgeDim ? `arr-eps-dim-${epsStyle.stroke.replace('#', '')}-${markerId}` : `arr-eps-${epsStyle.stroke.replace('#', '')}-${markerId}`)
          : (isEdgeDim ? `arr-dim-${markerId}` : `arr-${markerId}`)
        
        const isNew = newTransKeys instanceof Set
          ? t.originalSymbols?.some(sym => newTransKeys.has(`${t.from}-${t.to}-${sym}`))
          : false

        return (
          <g key={`path-${animKey ?? ''}-${i}`} style={{ cursor: isEps ? 'help' : 'default', transition: 'all 0.3s ease' }}>
            {isEps && (
              <path
                d={curvePath(p1.x, p1.y, p2.x, p2.y, bend)}
                fill="none" stroke="transparent" strokeWidth="12"
                onMouseEnter={(e) => handleEpsMove(e, t.role)}
                onMouseMove={(e) => handleEpsMove(e, t.role)}
                onMouseLeave={() => setTooltip(null)}
              />
            )}
            <path
              d={curvePath(p1.x, p1.y, p2.x, p2.y, bend)}
              fill="none"
              stroke={isNew ? (isEps ? stroke : '#2d6a4f') : stroke}
              strokeWidth={isNew ? 3 : (isHL ? 2.5 : (isEdgeDim ? 1 : 1.5))}
              strokeDasharray={isNew ? '1000' : dashArray}
              style={isNew ? {
                animation: 'edge-draw 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both',
                filter: `drop-shadow(0 0 3px ${isEps ? stroke : '#2d6a4f'}88)`,
              } : undefined}
              opacity={isEdgeDim ? 0.25 : (isEps ? 0.82 : 1)}
              markerEnd={`url(#${arrowId})`}
            />
          </g>
        )
      })}

      {/* ── Layer 2: States ── */}
      {states.map((s) => {
        const p = pos[s.id]
        if (!p) return null

        const isAccept   = acceptIds.has(s.id)
        const isDead     = !!s.isDead
        const isHL       = highlightPath?.[highlightPath.length - 1] === s.id
        const isNewest   = newestStateId != null && s.id === newestStateId
        const isNewState = newStateIds instanceof Set && newStateIds.has(s.id)
        const isDim      = activeNodeIds && !activeNodeIds.has(s.id)

        const stroke   = isDead   ? '#b0aa9a'
                       : isAccept || s.isStart ? accentColor : '#b0aa9a'
                       
        // If it's the active step nodes, maybe we fill them strongly, but the user expects white fill with dark borders for standard states, and strong fill for ONLY newly active states.
        const fill     = isDead   ? (darkMode ? '#1e1c18' : '#f0eeea')
                       : isHL     ? (isDFA ? '#dde6f5' : '#d8ede4')
                       : isNewState ? (isDFA ? '#c8d9f0' : '#c2e4d0')
                       : isNewest ? (isDFA ? '#c8d9f0' : '#c2e4d0')
                       : (darkMode ? '#1a1916' : '#ffffff')

        const transformOrigin = `${p.x}px ${p.y}px`

        return (
          <g
            key={`state-${animKey ?? ''}-${s.id}`}
            style={isNewState ? {
              animation: 'state-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
              transformOrigin,
              transformBox: 'fill-box',
              opacity: isDim ? 0.3 : 1,
              transition: 'all 0.3s ease',
            } : { opacity: isDim ? 0.3 : 1, transition: 'all 0.3s ease' }}
          >
            <circle
              cx={p.x} cy={p.y} r={R}
              fill={fill}
              stroke={isNewState ? '#2d6a4f' : (isHL ? accentColor : stroke)}
              strokeWidth={isDead ? 1.5 : (isNewState ? 3.5 : (s.isStart ? 2.5 : 2))}
              strokeDasharray={(isDead || isDim) ? '5,3' : undefined}
            />
            {isNewState && (
              <circle
                cx={p.x} cy={p.y} r={R + 4}
                fill="none" stroke="#2d6a4f" strokeWidth="2"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  animation: 'state-ring 0.75s ease-out forwards',
                }}
              />
            )}
            {isAccept && (
              <circle cx={p.x} cy={p.y} r={R - 5} fill="none" stroke={isDim ? stroke : accentColor} strokeWidth="1.5" />
            )}
            <text
              x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="central"
              fill={isDead ? (darkMode ? '#7a756a' : '#9a9590') : (darkMode ? '#e8e4dc' : '#1e1c18')}
              fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.label}
            </text>
          </g>
        )
      })}

      {/* ── Layer 3: Transition Labels (Pill Badges) ── */}
      {mergedTransitions.map((t, i) => {
        const p1 = pos[t.from], p2 = pos[t.to]
        if (!p1 || !p2) return null

        const bend = bends[i]
        const lp   = labelPos(p1.x, p1.y, p2.x, p2.y, bend, 0, Object.values(pos))

        const labelText = t.symbol
        const charWidth = 7.2
        const w = labelText.length * charWidth + 14
        const h = 22

        const isEdgeDim = activeTransKeys 
          ? !t.originalSymbols?.some(sym => activeTransKeys.has(`${t.from}-${t.to}-${sym}`))
          : (activeNodeIds && (!activeNodeIds.has(t.from) || !activeNodeIds.has(t.to)))

        return (
          <g 
            key={`label-${animKey ?? ''}-${i}`} 
            style={{ 
              pointerEvents: 'none', 
              userSelect: 'none',
              filter: `drop-shadow(0 1px 2px rgba(0,0,0,${darkMode ? 0.4 : 0.12}))`,
              opacity: isEdgeDim ? 0.25 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            <rect
              x={lp.x - w / 2} y={lp.y - h / 2}
              width={w} height={h}
              rx="4" ry="4"
              fill={darkMode ? '#1e1c18' : '#ffffff'}
              stroke={darkMode ? '#4a4842' : '#dcd8d0'}
              strokeWidth="1"
              opacity="0.95"
            />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={darkMode ? '#e8e4dc' : '#1e1c18'}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="12"
              fontWeight="700"
            >
              {labelText}
            </text>
          </g>
        )
      })}

      {/* ── Animation keyframes ── */}
      <defs>
        <style>{
          `@keyframes state-pop {
            from { transform: scale(0.1); opacity: 0; }
            60%  { transform: scale(1.1); opacity: 1; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes edge-draw {
            from { stroke-dashoffset: 1000; opacity: 0; }
            20%  { opacity: 1; }
            to   { stroke-dashoffset: 0;    opacity: 1; }
          }`
        }</style>
      </defs>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltip.x - 4} y={tooltip.y - 14}
            width={tooltip.text.length * 6.8 + 10} height={19}
            rx="3" ry="3" fill="rgba(30,28,24,0.88)"
          />
          <text
            x={tooltip.x + 1} y={tooltip.y}
            fill="#f5f4f0" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="600"
          >
            {tooltip.text}
          </text>
        </g>
      )}
    </svg>
  )
}