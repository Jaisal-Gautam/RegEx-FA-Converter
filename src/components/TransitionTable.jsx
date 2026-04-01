import { useState } from 'react'
import AutomatonSVG from './AutomatonSVG'
import { computeViewBox } from '../utils/layout'

/**
 * TransitionTable.jsx
 * Renders the NFA or DFA transition function as an HTML table,
 * followed by the automaton diagram below it.
 * Includes a toggle to switch between ε-NFA and DFA views.
 */
export default function TransitionTable({ nfaData, dfaData, alphabet, nfaSvgData, dfaSvgData, darkMode }) {
  // Default to DFA view if available, otherwise NFA
  const [view, setView] = useState(dfaData ? 'dfa' : 'nfa')

  // Keep view in sync when dfaData first becomes available
  const showDFA = view === 'dfa' && !!dfaData
  const svgData = showDFA ? dfaSvgData : nfaSvgData

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
            className="border border-border dark:border-[#2a2824] rounded overflow-hidden"
            style={{ height: '420px', background: darkMode ? '#121110' : '#f9f8f5' }}
          >
            <AutomatonSVG
              {...svgData}
              isDFA={showDFA}
              highlightPath={null}
              svgRef={null}
              newestStateId={null}
            />
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
