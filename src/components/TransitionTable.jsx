import { useState, useRef } from 'react'
import AutomatonSVG from './AutomatonSVG'
import { toPng } from 'html-to-image'

/**
 * TransitionTable.jsx
 * Renders the NFA or DFA transition function as an HTML table,
 * followed by the automaton diagram below it.
 * Includes a toggle to switch between ε-NFA and DFA views.
 */
export default function TransitionTable({ regexVal, nfaData, dfaData, alphabet, nfaSvgData, dfaSvgData, darkMode }) {
  // Default to DFA view if available, otherwise NFA
  const [view, setView] = useState(dfaData ? 'dfa' : 'nfa')
  const exportRef = useRef(null)

  // Keep view in sync when dfaData first becomes available
  const showDFA = view === 'dfa' && !!dfaData
  const svgData = showDFA ? dfaSvgData : nfaSvgData

  const handleDownloadWithTable = () => {
    if (!exportRef.current) return;
    toPng(exportRef.current, { backgroundColor: darkMode ? '#0f0e0c' : '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${regexVal || 'automaton'}_${showDFA ? 'dfa' : 'nfa'}_with_table.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image', err);
      });
  };

  if (!nfaData && !dfaData) {
    return (
      <div className="absolute inset-0 overflow-auto p-6 bg-bg dark:bg-[#0f0e0c]">
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
          <span className="text-4xl opacity-20">⊞</span>
          <p className="font-mono text-sm text-center opacity-60">
            Build an automaton to see its transition table
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-auto p-6 bg-bg dark:bg-[#0f0e0c] scrollbar-thin flex flex-col gap-6">

      <div className="flex items-center justify-between">
        {/* ── View Toggle ── */}
        <div className="flex items-center gap-1 p-1 rounded-lg w-fit"
             style={{ background: darkMode ? '#1e1c18' : '#eeece7', border: '1px solid', borderColor: darkMode ? '#2a2824' : '#d8d4cc' }}>
          <button
            onClick={() => setView('nfa')}
            disabled={!nfaData}
            className="font-mono text-xs px-4 py-1.5 rounded-md transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={
              view === 'nfa'
                ? { background: darkMode ? '#2d6a4f22' : '#fff', color: '#2d6a4f', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', fontWeight: 600 }
                : { color: darkMode ? '#8a8680' : '#9a9590', background: 'transparent' }
            }
          >
            ε‑NFA
          </button>
          <button
            onClick={() => setView('dfa')}
            disabled={!dfaData}
            className="font-mono text-xs px-4 py-1.5 rounded-md transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={
              view === 'dfa'
                ? { background: darkMode ? '#1e4f8c22' : '#fff', color: '#1e4f8c', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', fontWeight: 600 }
                : { color: darkMode ? '#8a8680' : '#9a9590', background: 'transparent' }
            }
          >
            DFA
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex bg-surface dark:bg-[#16140f] border border-border/50 dark:border-[#2a2824] rounded-md shadow-sm overflow-hidden backdrop-blur-sm">
          <button onClick={handleDownloadWithTable} title="Download Table with Diagram as PNG" className="px-3 py-2 text-primary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span className="ml-2 font-mono text-xs font-bold">Export Image</span>
          </button>
        </div>
      </div>

      {/* ── Transition Table ── */}
      {showDFA ? (
        <DFATable dfaData={dfaData} alphabet={alphabet} />
      ) : (
        <NFATable nfaData={nfaData} />
      )}

      {/* ── Automaton Diagram (below table) ── */}
      {svgData && (
        <div>
          <p className="font-mono text-xs text-muted mb-3">
            {showDFA ? 'DFA' : 'ε-NFA'} Diagram
          </p>
          <div
            className="border border-border dark:border-[#2a2824] rounded overflow-hidden flex justify-center"
            style={{ height: '420px', background: darkMode ? '#121110' : '#f9f8f5' }}
          >
            <AutomatonSVG
              {...svgData}
              isDFA={showDFA}
              highlightPath={null}
              svgRef={null}
              newestStateId={null}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* Hidden Export Container */}
      {(svgData && (nfaData || dfaData)) && (
        <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, width: '10px', height: '10px', overflow: 'hidden', opacity: 0 }}>
          <div 
            ref={exportRef} 
            className="flex flex-col gap-8 bg-surface dark:bg-[#0f0e0c]"
            style={{ width: '1200px', padding: '60px' }}
          >
            <h2 className="font-mono text-3xl font-bold text-center text-ink opacity-90 drop-shadow-sm">
              Regex: {regexVal}'s {showDFA ? 'DFA' : 'E-NFA'}
            </h2>
            
            <div className="flex justify-center flex-1">
               <AutomatonSVG
                    {...svgData}
                    isDFA={showDFA}
                    highlightPath={null}
                    svgRef={null}
                    darkMode={darkMode}
               />
            </div>
            
            <div className="bg-surface border border-border p-8 rounded-xl shadow-sm overflow-hidden flex justify-center">
              {showDFA ? (
                 <ExportDFATable dfaData={dfaData} alphabet={alphabet} />
              ) : (
                 <ExportNFATable nfaData={nfaData} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ── DFA Table ── */
function DFATable({ dfaData, alphabet }) {
  const { dfaStates, dfaTrans } = dfaData
  return (
    <>
      <div>
        <p className="font-mono text-xs text-muted mb-4">DFA Transition Table</p>
        <table className="ra-table w-full border-collapse bg-surface dark:bg-[#16140f] shadow-sm font-mono text-xs">
          <thead>
            <tr>
              <Th>State</Th>
              <Th>NFA States</Th>
              {alphabet.map(s => <Th key={s}>{s}</Th>)}
            </tr>
          </thead>
          <tbody>
            {dfaStates.map(s => (
              <tr
                key={s.id}
                className={`${s.isStart ? 'bg-accent/5 dark:bg-accent/10' : 'dark:bg-[#16140f]'} ${s.isAccept ? 'bg-accent/8 dark:bg-accent/10' : ''}`}
              >
                <Td>{s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}D{s.id}</Td>
                <Td className="text-muted text-[0.7rem]">
                  {'{' + s.nfaStates.map(i => 'q' + i).join(',') + '}'}
                </Td>
                {alphabet.map(sym => {
                  const t = dfaTrans.find(t => t.from === s.id && t.symbol === sym)
                  return <Td key={sym}>{t ? 'D' + t.to : '∅'}</Td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── NFA Table ── */
function NFATable({ nfaData }) {
  const { states, transitions, labelMap } = nfaData
  const lbl = (id) => labelMap?.get(id) ?? `q${id}`
  const syms = [...new Set(transitions.map(t => t.symbol))].sort((a, b) =>
    a === 'ε' ? 1 : b === 'ε' ? -1 : a.localeCompare(b)
  )

  return (
    <>
      <div>
        <p className="font-mono text-xs text-muted mb-4">ε-NFA Transition Table</p>
        <table className="ra-table w-full border-collapse bg-surface dark:bg-[#16140f] shadow-sm font-mono text-xs">
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
                className={`${s.isStart ? 'bg-accent/5 dark:bg-accent/10' : 'dark:bg-[#16140f]'} ${s.isAccept ? 'bg-accent/8 dark:bg-accent/10' : ''}`}
              >
                <Td>{s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}{lbl(s.id)}</Td>
                {syms.map(sym => {
                  const tos = transitions
                    .filter(t => t.from === s.id && t.symbol === sym)
                    .map(t => lbl(t.to))
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
      </div>
    </>
  )
}

/* ── Table primitives ── */
function Th({ children }) {
  return (
    <th className="bg-surface2 dark:bg-[#1e1c18] text-muted px-4 py-2 text-left tracking-widest border border-border dark:border-[#2a2824] text-[0.7rem] uppercase">
      {children}
    </th>
  )
}

function Td({ children, className = '', style }) {
  return (
    <td className={`px-4 py-2 border border-border dark:border-[#2a2824] bg-surface dark:bg-[#16140f] text-ink dark:text-[#c8c4bc] ${className}`} style={style}>
      {children}
    </td>
  )
}

function ExportDFATable({ dfaData, alphabet }) {
  if (!dfaData || !dfaData.dfaStates) return null;
  const { dfaStates, dfaTrans } = dfaData
  return (
    <table className="w-full border-collapse font-mono text-base">
      <thead>
        <tr>
          <ThE>State</ThE>
          <ThE>NFA States</ThE>
          {alphabet ? alphabet.map(s => <ThE key={s}>{s}</ThE>) : null}
        </tr>
      </thead>
      <tbody>
        {dfaStates.map(s => (
          <tr
            key={s.id}
            className={`${s.isStart ? 'bg-accent/5' : ''} ${s.isAccept ? 'bg-accent/8' : ''}`}
          >
            <TdE bold>{s.isStart ? '→ ' : ''}{s.isAccept ? '* ' : ''}D{s.id}</TdE>
            <TdE muted>{'{' + s.nfaStates.map(i => 'q' + i).join(', ') + '}'}</TdE>
            {alphabet ? alphabet.map(sym => {
              const t = dfaTrans.find(t => t.from === s.id && t.symbol === sym)
              return <TdE key={sym}>{t ? 'D' + t.to : '∅'}</TdE>
            }) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ExportNFATable({ nfaData }) {
  if (!nfaData || !nfaData.states) return null;
  const { states, transitions } = nfaData
  const syms = [...new Set(transitions.map(t => t.symbol))].sort((a, b) =>
    a === 'ε' ? 1 : b === 'ε' ? -1 : a.localeCompare(b)
  )

  return (
    <table className="w-full border-collapse font-mono text-base">
      <thead>
        <tr>
          <ThE>State</ThE>
          {syms.map(s => <ThE key={s}>{s}</ThE>)}
        </tr>
      </thead>
      <tbody>
        {states.map(s => (
          <tr
            key={s.id}
            className={`${s.isStart ? 'bg-accent/5' : ''} ${s.isAccept ? 'bg-accent/8' : ''}`}
          >
            <TdE bold>{s.isStart ? '→ ' : ''}{s.isAccept ? '* ' : ''}q{s.id}</TdE>
            {syms.map(sym => {
              const tos = transitions
                .filter(t => t.from === s.id && t.symbol === sym)
                .map(t => 'q' + t.to)
              return (
                <TdE key={sym} style={{ color: sym === 'ε' ? '#3a5a8c' : undefined }}>
                  {tos.length ? '{' + tos.join(', ') + '}' : '∅'}
                </TdE>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ThE({ children }) {
  return (
    <th className="bg-surface2 text-muted px-4 py-3 text-left border border-border/50 font-bold uppercase tracking-wider">
      {children}
    </th>
  )
}

function TdE({ children, bold, muted, style }) {
  return (
    <td
      className={`px-4 py-3 border border-border/40 ${bold ? 'font-bold text-ink' : muted ? 'text-muted text-sm' : 'text-ink/80'}`}
      style={style}
    >
      {children}
    </td>
  )
}
