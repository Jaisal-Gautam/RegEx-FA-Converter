/**
 * AnimationOverlay.jsx
 *
 * Top-right overlay shown during Build ε-NFA / Convert to DFA.
 * Displays:
 *  - A mini SVG of the automaton growing step by step
 *  - A live transition table beneath it
 *  - Progress bar + step counter
 */

import { useEffect, useRef, useState } from 'react'

// ─── Small inline SVG renderer ────────────────────────────────────────────────
const R = 22 // state radius in the mini diagram

function miniViewBox(pos) {
  if (!pos || !Object.keys(pos).length) return '0 0 200 100'
  const xs = Object.values(pos).map(p => p.x)
  const ys = Object.values(pos).map(p => p.y)
  const pad = R + 20
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width  = Math.max(...xs) - Math.min(...xs) + 2 * pad
  const height = Math.max(...ys) - Math.min(...ys) + 2 * pad
  return `${minX} ${minY} ${Math.max(width, 100)} ${Math.max(height, 80)}`
}

function MiniSVG({ step, pos, isDFA, acceptIds, startId }) {
  if (!step || !pos) return null
  const { states = [], transitions = [] } = step
  const accentColor = isDFA ? '#3a5a8c' : '#2d6a4f'

  return (
    <svg
      viewBox={miniViewBox(pos)}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: 160, background: '#f9f9f6' }}
    >
      <defs>
        <marker id="arr-mini" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#9a9a8a" />
        </marker>
        <marker id="arr-mini-acc" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={accentColor} />
        </marker>
      </defs>

      {/* Transitions */}
      {transitions.map((t, i) => {
        const fp = pos[t.from]
        const tp = pos[t.to]
        if (!fp || !tp) return null
        if (t.from === t.to) {
          // self-loop
          return (
            <g key={i}>
              <path
                d={`M ${fp.x - 10},${fp.y - R} A 14 14 0 1 1 ${fp.x + 10},${fp.y - R}`}
                fill="none" stroke="#9a9a8a" strokeWidth="1.2"
                markerEnd="url(#arr-mini)"
              />
              <text x={fp.x} y={fp.y - R - 20} textAnchor="middle" fontSize="8" fill="#555">{t.symbol}</text>
            </g>
          )
        }
        const dx = tp.x - fp.x, dy = tp.y - fp.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2
        const nx = -dy / len * 14, ny = dx / len * 14
        return (
          <g key={i}>
            <path
              d={`M ${fp.x + dx/len*R} ${fp.y + dy/len*R} Q ${mx + nx} ${my + ny} ${tp.x - dx/len*R} ${tp.y - dy/len*R}`}
              fill="none" stroke={t.symbol === 'ε' ? '#b8c8e8' : '#9a9a8a'} strokeWidth="1.2"
              markerEnd="url(#arr-mini)"
            />
            <text x={mx + nx * 1.4} y={my + ny * 1.4} textAnchor="middle" fontSize="7.5" fill="#666">{t.symbol}</text>
          </g>
        )
      })}

      {/* States */}
      {states.map((s, i) => {
        const p = pos[s.id]
        if (!p) return null
        const isStart  = s.id === startId
        const isAccept = acceptIds?.has(s.id)
        return (
          <g key={s.id}>
            {/* start arrow */}
            {isStart && (
              <line
                x1={p.x - R - 22} y1={p.y} x2={p.x - R - 2} y2={p.y}
                stroke={accentColor} strokeWidth="1.5" markerEnd="url(#arr-mini-acc)"
              />
            )}
            <circle
              cx={p.x} cy={p.y} r={R}
              fill={
                i === states.length - 1 && s.id !== startId // newest state
                  ? (isDFA ? '#dce6f5' : '#d5ede3')
                  : '#fff'
              }
              stroke={isStart ? accentColor : '#555'}
              strokeWidth={isStart ? 1.8 : 1.2}
              style={{
                animation: i === states.length - 1 ? 'pop-in 0.3s ease' : 'none',
              }}
            />
            {isAccept && (
              <circle cx={p.x} cy={p.y} r={R - 4} fill="none" stroke={accentColor} strokeWidth="1" />
            )}
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#333" fontFamily="monospace">
              {s.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Mini table ────────────────────────────────────────────────────────────────
function MiniTable({ step, alphabet, isDFA }) {
  if (!step || !step.states.length) return null
  const { states, transitions } = step

  if (isDFA) {
    const syms = alphabet || []
    return (
      <table className="w-full border-collapse text-[9px] font-mono">
        <thead>
          <tr>
            {['State', 'NFA', ...syms].map(h => (
              <th key={h} className="border border-[#d0d0c4] bg-[#f0f0eb] px-1 py-0.5 text-left text-[#666]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map((s, i) => (
            <tr
              key={s.id}
              className={i === states.length - 1 ? 'bg-[#dce6f5]' : ''}
            >
              <td className="border border-[#d0d0c4] px-1 py-0.5 text-[#333]">
                {s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}D{s.id}
              </td>
              <td className="border border-[#d0d0c4] px-1 py-0.5 text-[#888] text-[8px]">
                {'{' + (s.nfaStates || []).map(i => 'q' + i).join(',') + '}'}
              </td>
              {syms.map(sym => {
                const t = transitions.find(t => t.from === s.id && t.symbol === sym)
                return (
                  <td key={sym} className="border border-[#d0d0c4] px-1 py-0.5 text-[#444]">
                    {t ? 'D' + t.to : '∅'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // NFA table
  const syms = [...new Set(transitions.map(t => t.symbol))].sort((a, b) =>
    a === 'ε' ? 1 : b === 'ε' ? -1 : a.localeCompare(b)
  )

  return (
    <table className="w-full border-collapse text-[9px] font-mono">
      <thead>
        <tr>
          {['State', ...syms].map(h => (
            <th key={h} className="border border-[#d0d0c4] bg-[#f0f0eb] px-1 py-0.5 text-left text-[#666]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {states.map((s, i) => (
          <tr
            key={s.id}
            className={i === states.length - 1 ? 'bg-[#d5ede3]' : ''}
          >
            <td className="border border-[#d0d0c4] px-1 py-0.5 text-[#333]">
              {s.isStart ? '→' : ''}{s.isAccept ? '*' : ''}q{s.id}
            </td>
            {syms.map(sym => {
              const tos = transitions.filter(t => t.from === s.id && t.symbol === sym).map(t => 'q' + t.to)
              return (
                <td key={sym} className="border border-[#d0d0c4] px-1 py-0.5 text-[#444]" style={{ color: sym === 'ε' ? '#3a5a8c' : undefined }}>
                  {tos.length ? '{' + tos.join(',') + '}' : '∅'}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Main overlay component ─────────────────────────────────────────────────
export default function AnimationOverlay({ animState }) {
  const {
    isPlaying,
    currentStep,
    totalSteps,
    stepData,
    pos,
    acceptIds,
    startId,
    isDFA,
    alphabet,
    label,
  } = animState || {}

  if (!isPlaying && !stepData) return null

  const progress = totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100

  return (
    <div
      className="absolute top-2 right-2 z-50 rounded-lg shadow-2xl border border-[#d0d0c0] overflow-hidden flex flex-col"
      style={{
        width: 340,
        background: '#fffffe',
        maxHeight: '90vh',
        animation: isPlaying ? 'slide-in 0.2s ease' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-mono font-bold text-white"
        style={{ background: isDFA ? '#3a5a8c' : '#2d6a4f' }}
      >
        <span>{label || (isDFA ? 'Building DFA…' : 'Building ε-NFA…')}</span>
        <span className="opacity-80 text-[10px]">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#e0e0d8]">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${progress}%`,
            background: isDFA ? '#3a5a8c' : '#2d6a4f',
          }}
        />
      </div>

      {/* Mini diagram */}
      <div className="border-b border-[#e8e8e0]">
        <MiniSVG
          step={stepData}
          pos={pos}
          isDFA={isDFA}
          acceptIds={acceptIds}
          startId={startId}
        />
      </div>

      {/* Live transition table */}
      <div className="overflow-auto p-2" style={{ maxHeight: 200 }}>
        <p className="text-[9px] font-mono text-[#888] mb-1 uppercase tracking-wider">
          {isDFA ? 'DFA' : 'ε-NFA'} Transition Table
        </p>
        <MiniTable step={stepData} alphabet={alphabet} isDFA={isDFA} />
      </div>

      <style>{`
        @keyframes pop-in {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes slide-in {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}