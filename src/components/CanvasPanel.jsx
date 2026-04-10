import { useRef } from 'react'
import AutomatonSVG from './AutomatonSVG'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

/**
 * CanvasPanel.jsx
 * Renders the automaton on a dot-grid canvas with a construction steps overlay.
 */
export default function CanvasPanel({ regexVal, svgData, isDFA, highlightPath, tableData, alphabet, isAnimating, darkMode, postfix, animStep, totalAnimSteps, dfaRaw, nfaLabelMap }) {
  const svgRef = useRef(null)

  const handleDownload = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Inject title into exported SVG
    const viewBox = clone.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(" ").map(Number);
      if (parts.length === 4) {
        const [minX, minY, w, h] = parts;
        clone.setAttribute("viewBox", `${minX} ${minY - 70} ${w} ${h + 70}`);
        
        const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textNode.setAttribute("x", minX + w / 2);
        textNode.setAttribute("y", minY - 25);
        textNode.setAttribute("text-anchor", "middle");
        textNode.setAttribute("font-family", "monospace, monospace");
        textNode.setAttribute("font-size", "22");
        textNode.setAttribute("font-weight", "bold");
        textNode.setAttribute("fill", darkMode ? "#e8e4dc" : "#1a1916");
        textNode.textContent = `Regex: ${regexVal}'s ${isDFA ? 'DFA' : 'E-NFA'}`;
        
        clone.prepend(textNode);
      }
    }

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${regexVal || 'automaton'}_${isDFA ? 'dfa' : 'nfa'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              <div className="absolute top-6 inset-x-0 z-10 pointer-events-none flex justify-center">
                <h2 className="font-mono text-xl md:text-2xl font-bold opacity-80 text-ink dark:text-[#e8e4dc] drop-shadow-sm">
                  Regex: {regexVal}'s {isDFA ? 'DFA' : 'E-NFA'}
                </h2>
              </div>
              {/* Toolbar */}
              <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
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