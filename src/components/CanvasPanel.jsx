import { useRef, useState } from 'react'
import AutomatonSVG from './AutomatonSVG'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

/**
 * Render a regex string with '*' shown as a superscript *.
 */
function SuperRegex({ text, className = '' }) {
  if (!text) return null
  const parts = text.split('*')
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <sup style={{ fontSize: '0.65em', verticalAlign: 'super', lineHeight: 0 }}>*</sup>
          )}
        </span>
      ))}
    </span>
  )
}

/**
 * CanvasPanel.jsx
 * Renders the automaton on a dot-grid canvas + live δ transition table below.
 */
export default function CanvasPanel({
  regexVal, svgData, isDFA, highlightPath, tableData, alphabet,
  isAnimating, darkMode, postfix, animStep, totalAnimSteps, dfaRaw, nfaLabelMap,
  builderStepLabel,
}) {
  const svgRef = useRef(null)

  const handleDownload = () => {
    if (!svgRef.current) return
    const clone = svgRef.current.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const viewBox = clone.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.split(' ').map(Number)
      if (parts.length === 4) {
        const [minX, minY, w, h] = parts
        clone.setAttribute('viewBox', `${minX} ${minY - 70} ${w} ${h + 70}`)
        const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        textNode.setAttribute('x', minX + w / 2)
        textNode.setAttribute('y', minY - 25)
        textNode.setAttribute('text-anchor', 'middle')
        textNode.setAttribute('font-family', 'monospace, monospace')
        textNode.setAttribute('font-size', '22')
        textNode.setAttribute('font-weight', 'bold')
        textNode.setAttribute('fill', darkMode ? '#e8e4dc' : '#1a1916')
        textNode.textContent = `Regex: ${regexVal}'s ${isDFA ? 'DFA' : 'ε-NFA'}`
        clone.prepend(textNode)
      }
    }
    const svgStr = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${regexVal || 'automaton'}_${isDFA ? 'dfa' : 'nfa'}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="absolute inset-0 overflow-hidden canvas-bg flex flex-col">
      {!svgData ? (
        /* ── Empty state ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted">
          <span className="text-5xl opacity-20">{isDFA ? '◇' : '◈'}</span>
          <p className="font-mono text-sm text-center leading-relaxed opacity-60">
            {isDFA
              ? 'Build the ε-NFA first,\nthen convert to DFA'
              : 'Enter a regular expression\nand click Build ε-NFA'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Automaton canvas (takes remaining height minus table) ── */}
          <div className="relative flex-1 min-h-0">
            <TransformWrapper
              initialScale={1}
              minScale={0.1}
              maxScale={4}
              centerOnInit={true}
              wheel={{ step: 0.1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Regex Title Overlay */}
                  <div className="absolute top-4 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1">
                    <h2 className="font-mono text-xl md:text-2xl font-bold opacity-80 text-ink dark:text-[#e8e4dc] drop-shadow-sm flex items-baseline gap-0">
                      Regex:&nbsp;
                      <SuperRegex text={regexVal} />
                      &apos;s {isDFA ? 'DFA' : 'ε-NFA'}
                    </h2>
                    {builderStepLabel && (
                      <span className="font-mono text-[0.7rem] text-muted dark:text-[#5a5650] bg-surface/80 dark:bg-[#16140f]/80 px-2 py-0.5 rounded-full border border-border/30">
                        {builderStepLabel}
                      </span>
                    )}
                  </div>

                  {/* Toolbar */}
                  <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                    <div className="flex bg-surface dark:bg-[#16140f] border border-border/50 dark:border-[#2a2824] rounded-md overflow-hidden backdrop-blur-sm shadow-md">
                      <button onClick={() => zoomIn()} title="Zoom In" className="px-3 py-1.5 text-ink/70 dark:text-[#e8e4dc]/70 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-mono text-lg transition-colors border-r border-border/50 dark:border-[#2a2824]">+</button>
                      <button onClick={() => zoomOut()} title="Zoom Out" className="px-3 py-1.5 text-ink/70 dark:text-[#e8e4dc]/70 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-mono text-lg transition-colors border-r border-border/50 dark:border-[#2a2824]">−</button>
                      <button onClick={() => resetTransform()} title="Reset Zoom" className="px-3 py-2 text-ink/70 dark:text-[#e8e4dc]/70 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors border-r border-border/50 dark:border-[#2a2824]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button onClick={handleDownload} title="Download SVG" className="px-3 py-2 text-ink/70 dark:text-[#e8e4dc]/70 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      </button>
                    </div>
                  </div>

                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                    <AutomatonSVG
                      {...svgData}
                      isDFA={isDFA}
                      highlightPath={highlightPath}
                      svgRef={svgRef}
                      darkMode={darkMode}
                      newestStateId={isAnimating && svgData?.states?.length > 0
                        ? svgData.states[svgData.states.length - 1]?.id
                        : null}
                      newStateIds={svgData?.newStateIds}
                      newTransKeys={svgData?.newTransKeys}
                      animKey={svgData?.animKey}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* ── Live δ Transition Table ── */}
          {(tableData?.states?.length > 0 || svgData?.states?.length > 0) && (() => {
            const displayStates = tableData?.states || svgData.states;
            const displayTransitions = tableData?.transitions || svgData.transitions || [];
            return (
              <LiveDeltaTable
                states={displayStates}
                transitions={displayTransitions}
                startId={svgData.startId}
                acceptIds={svgData.acceptIds}
              isDFA={isDFA}
              darkMode={darkMode}
              newStateIds={svgData?.newStateIds}
              newTransKeys={svgData?.newTransKeys}
              activeNodeIds={svgData?.activeNodeIds}
              activeSymbol={svgData?.activeSymbol}
              activeRowId={svgData?.activeRowId}
            />
            )
          })()}
        </>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Live δ Transition Table
   Shows the current build state as a δ table below the automaton.
   New rows/cells are highlighted as the construction advances step by step.
   ──────────────────────────────────────────────────────────────────────────── */
function LiveDeltaTable({ states, transitions, startId, acceptIds, isDFA, darkMode, newStateIds, newTransKeys, activeSymbol, activeRowId }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sort states numerically (q0, q1, q2...)
  const sortedStates = [...states].sort((a, b) => a.id - b.id)

  // Collect symbols (literal symbols first, then ε)
  const syms = [...new Set(transitions.map(t => t.symbol))].sort((a, b) =>
    a === 'ε' ? 1 : b === 'ε' ? -1 : a.localeCompare(b)
  )

  const bg    = darkMode ? '#16140f' : '#f8f7f4'
  const rowBg = darkMode ? '#1a1916' : '#ffffff'
  const hdrBg = darkMode ? '#1e1c18' : '#f0ede8'
  const border= darkMode ? '#2a2824' : '#e2dfda'
  const ink   = darkMode ? '#e8e4dc' : '#1e1c18'
  const muted = darkMode ? '#5a5650' : '#88857d'

  if (!states.length || !syms.length) return null

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${border}`,
        background: bg,
        maxHeight: isCollapsed ? '32px' : '200px',
        overflow: 'hidden',
        transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header label & Toggle */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ 
          padding: '6px 14px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          background: isCollapsed ? hdrBg : 'transparent'
        }}
      >
        <div style={{
          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: darkMode ? '#ffffff10' : '#00000008', borderRadius: 4, transform: isCollapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform 0.2s'
        }}>
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
             <polyline points="6 9 12 15 18 9"></polyline>
           </svg>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          δ Transition Table
        </span>
        {!isCollapsed && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: muted, opacity: 0.7 }}>
            (updates with each construction step)
          </span>
        )}
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 168, paddingBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 11 }}>
          <thead>
            <tr>
              {/* State column */}
              <th style={{ background: hdrBg, color: muted, padding: '3px 10px', textAlign: 'left', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, fontWeight: 700, position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'nowrap' }}>
                State
              </th>
              {syms.map(sym => {
                const isActive = sym === activeSymbol
                return (
                  <th key={sym} style={{
                    background: isActive
                      ? (isDFA ? 'rgba(171, 92, 28, 0.2)' : 'rgba(45, 106, 79, 0.2)')
                      : hdrBg,
                    color: isActive ? (darkMode ? '#fff' : '#000') : (sym === 'ε' ? '#3a5a8c' : muted),
                    padding: '3px 10px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${border}`,
                    fontWeight: 700,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    boxShadow: isActive ? `inset 0 -2px 0 ${isDFA ? '#ab5c1c' : '#2d6a4f'}` : 'none',
                  }}>
                    {sym}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedStates.map(s => {
              const isNew = newStateIds instanceof Set && newStateIds.has(s.id)
              const isStart = s.id === startId
              const isAccept = acceptIds instanceof Set && acceptIds.has(s.id)

              return (
                <tr
                  key={s.id}
                  style={{
                    background: isNew
                      ? (darkMode ? 'rgba(45,106,79,0.12)' : 'rgba(45,106,79,0.06)')
                      : rowBg,
                    transition: 'background 0.4s',
                  }}
                >
                  {/* State label */}
                  <td style={{
                    padding: '3px 10px',
                    borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${border}`,
                    fontWeight: 700,
                    color: isAccept ? '#2d6a4f' : ink,
                    whiteSpace: 'nowrap',
                    background: s.id === activeRowId ? (isDFA ? 'rgba(171,92,28,0.1)' : 'rgba(45,106,79,0.1)') : 'transparent',
                    boxShadow: s.id === activeRowId ? `inset 2px 0 0 ${isDFA ? '#ab5c1c' : '#2d6a4f'}` : 'none'
                  }}>
                    {isStart && <span style={{ color: '#2d6a4f', marginRight: 2 }}>→</span>}
                    {isAccept && <span style={{ color: '#2d6a4f', marginRight: 1 }}>*</span>}
                    {s.label ?? `q${s.id}`}
                    {isNew && <span style={{ marginLeft: 4, color: '#2d6a4f', fontSize: 9, fontWeight: 900 }}>NEW</span>}
                  </td>
                  {syms.map(sym => {
                    const tos = transitions
                      .filter(t => t.from === s.id && t.symbol === sym)
                      .map(t => {
                        const target = states.find(st => st.id === t.to)
                        return target?.label ?? `q${t.to}`
                      })
                    // Check if any of these edges are new
                    const anyNew = newTransKeys instanceof Set && transitions
                      .filter(t => t.from === s.id && t.symbol === sym)
                      .some(t => newTransKeys.has(`${t.from}-${t.to}-${t.symbol}`))

                    return (
                      <td key={sym}
                        className={anyNew ? 'table-pulse' : ''}
                        style={{
                        padding: '3px 10px',
                        textAlign: 'center',
                        borderBottom: `1px solid ${border}`,
                        borderRight: `1px solid ${border}`,
                        color: anyNew ? '#2d6a4f' : tos.length ? ink : muted,
                        fontWeight: anyNew ? 700 : 400,
                        background: (sym === activeSymbol && s.id === activeRowId)
                          ? (isDFA ? 'rgba(171,92,28,0.2)' : 'rgba(45,106,79,0.2)')
                          : anyNew
                            ? (darkMode ? 'rgba(45,106,79,0.15)' : 'rgba(45,106,79,0.08)')
                            : 'transparent',
                        transition: 'background 0.4s, color 0.3s',
                      }}>
                        {tos.length ? `{${tos.join(',')}}` : '∅'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Mini DFA Table for overlay ── */
function MiniDFATable({ dfaData, alphabet }) {
  const { dfaStates, dfaTrans } = dfaData
  return (
    <table className="w-full border-collapse font-mono text-[0.65rem]">
      <thead>
        <tr>
          <Th>State</Th>
          <Th>NFA</Th>
          {alphabet.map(s => <Th key={s}>{s}</Th>)}
        </tr>
      </thead>
      <tbody>
        {dfaStates.map(s => (
          <tr
            key={s.id}
            className={`${s.isStart ? 'bg-accent/5' : ''} ${s.isAccept ? 'bg-accent/8' : ''}`}
          >
            <Td bold>{s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}D{s.id}</Td>
            <Td muted>{'{' + s.nfaStates.map(i => 'q' + i).join(',') + '}'}</Td>
            {alphabet.map(sym => {
              const t = dfaTrans.find(t => t.from === s.id && t.symbol === sym)
              return <Td key={sym}>{t ? 'D' + t.to : '∅'}</Td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Mini NFA Table for overlay ── */
function MiniNFATable({ nfaData }) {
  const { states, transitions } = nfaData
  const syms = [...new Set(transitions.map(t => t.symbol))].sort((a, b) =>
    a === 'ε' ? 1 : b === 'ε' ? -1 : a.localeCompare(b)
  )

  return (
    <table className="w-full border-collapse font-mono text-[0.65rem]">
      <thead>
        <tr>
          <Th>State</Th>
          {syms.map(s => <Th key={s}>{s}</Th>)}
        </tr>
      </thead>
      <tbody>
        {states.map(s => (
          <tr
            key={s.id}
            className={`${s.isStart ? 'bg-accent/5' : ''} ${s.isAccept ? 'bg-accent/8' : ''}`}
          >
            <Td bold>{s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}q{s.id}</Td>
            {syms.map(sym => {
              const tos = transitions
                .filter(t => t.from === s.id && t.symbol === sym)
                .map(t => 'q' + t.to)
              return (
                <Td key={sym} style={{ color: sym === 'ε' ? '#3a5a8c' : undefined }}>
                  {tos.length ? '{' + tos.join(',') + '}' : '∅'}
                </Td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Table primitives ── */
function Th({ children }) {
  return (
    <th className="bg-surface2/80 text-muted px-2 py-1 text-left border border-border/50 sticky top-0 z-10 font-semibold">
      {children}
    </th>
  )
}

function Td({ children, bold, muted, style }) {
  return (
    <td
      className={`px-2 py-1 border border-border/40 ${bold ? 'font-semibold text-ink' : muted ? 'text-muted text-[0.6rem]' : 'text-ink/80'}`}
      style={style}
    >
      {children}
    </td>
  )
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[0.7rem] text-muted">
      <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: color }} />
      {label}
    </div>
  )
}

 function LegendLine({ stroke, dash, label }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[0.7rem] text-muted">
      <svg width="22" height="8" className="flex-shrink-0">
        <line
          x1="0" y1="4" x2="22" y2="4"
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray={dash}
        />
      </svg>
      {label}
    </div>
  )
}