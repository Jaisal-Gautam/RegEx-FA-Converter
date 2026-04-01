import AutomatonSVG from './AutomatonSVG'

/**
 * CanvasPanel.jsx
 * Renders the automaton on a dot-grid canvas. Static (no pan/zoom or legend).
 */
export default function CanvasPanel({ svgData, isDFA, highlightPath, tableData, alphabet, isAnimating, darkMode }) {
  return (
    <div className="absolute inset-0 overflow-hidden canvas-bg">
      {!svgData ? (
        /* ── Empty state ── */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted">
          <span className="text-5xl opacity-20">{isDFA ? '◇' : '◈'}</span>
          <p className="font-mono text-sm text-center leading-relaxed opacity-60">
            {isDFA
              ? 'Build the ε-NFA first,\nthen convert to DFA'
              : 'Enter a regular expression\nand click Build ε-NFA'}
          </p>
        </div>
      ) : (
        <AutomatonSVG
          {...svgData}
          isDFA={isDFA}
          highlightPath={highlightPath}
          svgRef={null}
          newestStateId={isAnimating && svgData?.states?.length > 0
            ? svgData.states[svgData.states.length - 1]?.id
            : null}
        />
      )}
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