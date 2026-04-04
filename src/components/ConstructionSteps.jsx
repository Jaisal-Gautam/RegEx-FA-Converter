/**
 * ConstructionSteps.jsx
 *
 * Draggable overlay in the canvas panel — matches the vertical timeline design.
 * NFA tab  → Thompson's construction steps (from postfix tokens)
 * DFA tab  → Subset construction steps     (from dfaRaw data)
 *
 * The panel can be dragged by its header to avoid overlapping the FA diagram.
 */

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   NFA — Thompson's construction steps
   ═══════════════════════════════════════════════════════════════════════════ */

const NFA_STEP_META = {
  char:   { label: 'Literal',  icon: 'α', colorClass: 'step-literal'  },
  union:  { label: 'Union',    icon: '|', colorClass: 'step-union'    },
  concat: { label: 'Concat',   icon: '·', colorClass: 'step-concat'   },
  star:   { label: 'Star',     icon: '*', colorClass: 'step-star'     },
  plus:   { label: 'Plus',     icon: '+', colorClass: 'step-plus'     },
  ques:   { label: 'Optional', icon: '?', colorClass: 'step-optional' },
}

function deriveNFASteps(postfix, nfaLabelMap) {
  if (!postfix || !postfix.length) return []

  const steps = []
  let stateCounter = 0

  const lbl = (id) => {
    if (nfaLabelMap && nfaLabelMap.get) {
      return nfaLabelMap.get(id) ?? `q${id}`
    }
    return `q${id}`
  }

  for (const token of postfix) {
    const meta = NFA_STEP_META[token.type]
    if (!meta) continue

    let newStates = 0
    let rule = ''
    let description = ''

    switch (token.type) {
      case 'char':
        newStates = 2
        rule = 'Thompson Base Rule'
        description = `For symbol '${token.val}': create start ${lbl(stateCounter)} and accept ${lbl(stateCounter + 1)} with a single '${token.val}' transition`
        break
      case 'union':
        newStates = 2
        rule = 'Thompson Union Rule  (R₁ | R₂)'
        description = `New start ${lbl(stateCounter)} → ε-branches into both sub-NFAs; both accepts → ε → new accept ${lbl(stateCounter + 1)}`
        break
      case 'concat':
        newStates = 0
        rule = 'Thompson Concatenation Rule  (R₁ · R₂)'
        description = `Merge accept of first NFA with start of second via ε-transition`
        break
      case 'star':
        newStates = 1
        rule = 'Thompson Kleene Star Rule  (R*)'
        description = `Accept → ε → start (loop-back), start → ε → new accept ${lbl(stateCounter)} (skip), accept → ε → new accept (exit)`
        break
      case 'plus':
        newStates = 1
        rule = 'Thompson Plus Rule  (R⁺)'
        description = `Accept → ε → start (loop-back for ≥1), accept → ε → new accept ${lbl(stateCounter)} (exit)`
        break
      case 'ques':
        newStates = 1
        rule = 'Thompson Optional Rule  (R?)'
        description = `Start → ε → new accept ${lbl(stateCounter)} (zero-skip), accept → ε → new accept (exit)`
        break
      default:
        break
    }

    steps.push({
      index: steps.length,
      type: token.type,
      value: token.val,
      meta,
      rule,
      newStates,
      stateRange: newStates > 0
        ? [stateCounter, stateCounter + newStates - 1]
        : null,
      stateRangeLabels: newStates > 0
        ? [lbl(stateCounter), lbl(stateCounter + newStates - 1)]
        : null,
      description,
    })

    stateCounter += newStates
  }

  return steps
}


/* ═══════════════════════════════════════════════════════════════════════════
   DFA — Subset (powerset) construction steps
   ═══════════════════════════════════════════════════════════════════════════ */

const DFA_STEP_META = {
  closure:  { label: 'ε-Closure', icon: 'ε', colorClass: 'step-dfa-closure'  },
  move:     { label: 'Move',      icon: '→', colorClass: 'step-dfa-move'     },
  newState: { label: 'New State', icon: '◉', colorClass: 'step-dfa-new'     },
  trans:    { label: 'Transition',icon: '⟶', colorClass: 'step-dfa-trans'   },
}

function deriveDFASteps(dfaRaw, alphabet, nfaLabelMap) {
  if (!dfaRaw || !dfaRaw.dfaStates || !dfaRaw.dfaStates.length) return []

  const { dfaStates, dfaTrans } = dfaRaw
  const steps = []

  const startState = dfaStates[0]
  steps.push({
    index: 0,
    stepType: 'closure',
    meta: DFA_STEP_META.closure,
    dfaId: 0,
    nfaSet: startState.nfaStates,
    isAccept: startState.isAccept,
    description: `ε-closure of start → {${startState.nfaStates.map(s => (nfaLabelMap?.get(s) ?? 'q' + s)).join(', ')}}`,
    label: `D0 = {${startState.nfaStates.map(s => (nfaLabelMap?.get(s) ?? 'q' + s)).join(',')}}`,
  })

  for (let i = 1; i < dfaStates.length; i++) {
    const s = dfaStates[i]
    const incomingTrans = dfaTrans.filter(t => t.to === s.id)
    const firstIncoming = incomingTrans[0]

    let fromLabel = firstIncoming ? `D${firstIncoming.from}` : '?'
    let symbol = firstIncoming ? firstIncoming.symbol : '?'

    steps.push({
      index: steps.length,
      stepType: 'newState',
      meta: DFA_STEP_META.newState,
      dfaId: s.id,
      nfaSet: s.nfaStates,
      isAccept: s.isAccept,
      symbol,
      fromDfa: firstIncoming?.from,
      description: `move(${fromLabel}, '${symbol}') then ε-close → {${s.nfaStates.map(id => (nfaLabelMap?.get(id) ?? 'q' + id)).join(', ')}}`,
      label: `D${s.id} = {${s.nfaStates.map(id => (nfaLabelMap?.get(id) ?? 'q' + id)).join(',')}}`,
    })
  }

  const transCount = dfaTrans.length
  const selfLoops = dfaTrans.filter(t => t.from === t.to).length
  steps.push({
    index: steps.length,
    stepType: 'summary',
    meta: { label: 'Complete', icon: '✓', colorClass: 'step-dfa-done' },
    description: `${dfaStates.length} states, ${transCount} transitions${selfLoops ? ` (${selfLoops} self-loop${selfLoops > 1 ? 's' : ''})` : ''}`,
    label: 'DFA construction complete',
  })

  return steps
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component — renders NFA or DFA steps with timeline design
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ConstructionSteps({
  postfix,
  dfaRaw,
  alphabet,
  isAnimating,
  animStep,
  totalAnimSteps,
  isDFA,
  darkMode,
  nfaLabelMap,
  goToStep,
  onClose,
}) {
  const nfaSteps = useMemo(() => deriveNFASteps(postfix, nfaLabelMap), [postfix, nfaLabelMap])
  const dfaSteps = useMemo(() => deriveDFASteps(dfaRaw, alphabet, nfaLabelMap), [dfaRaw, alphabet, nfaLabelMap])

  const steps = isDFA ? dfaSteps : nfaSteps
  const headerLabel = isDFA ? 'Subset Construction' : 'Construction Steps'

  const [collapsed, setCollapsed] = useState(false)

  if (!steps.length) return null

  /* Active step during animation */
  let activeStepIdx = steps.length - 1
  if (isAnimating) {
    if (isDFA) {
      activeStepIdx = Math.min(animStep, steps.length - 2)
    } else {
      let cumulative = 0
      for (let i = 0; i < steps.length; i++) {
        cumulative += steps[i].newStates || 1
        if (cumulative > animStep + 1) {
          activeStepIdx = i
          break
        }
      }
    }
  }

  const accentColor = isDFA ? '#3a5a8c' : '#2d6a4f'

  const onStepClick = useCallback((stepIdx) => {
    if (!goToStep) return;
    if (isDFA) {
      goToStep(Math.min(stepIdx, totalAnimSteps - 1), true);
    } else {
      let cumulative = 0;
      for (let j = 0; j <= stepIdx; j++) {
        cumulative += steps[j].newStates || 1;
      }
      goToStep(Math.min(cumulative - 1, totalAnimSteps - 1), false);
    }
  }, [isDFA, steps, goToStep, totalAnimSteps]);

  return (
    <div
      className={`construction-steps-panel bg-surface dark:bg-[#16140f] border-l border-border dark:border-[#2a2824] flex flex-col h-full min-h-0 overflow-hidden ${darkMode ? 'dark-steps' : ''}`}
      style={{
        zIndex: 40,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
        transition: 'box-shadow 0.3s ease',
        animation: 'steps-slide-in 0.3s ease-out',
        userSelect: 'none',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 14px',
          borderBottom: darkMode ? '1px solid #2a2824' : '1px solid #e8e5de',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: darkMode
            ? 'rgba(30, 28, 24, 0.8)'
            : 'rgba(249, 248, 245, 0.9)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            background: accentColor,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: darkMode ? '#a09a90' : '#7a756a',
          }}
        >
          {headerLabel}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9,
            color: darkMode ? '#5a5650' : '#aaa59c',
            fontWeight: 600,
          }}
        >
          {steps.length} {isDFA ? 'steps' : 'ops'}
        </span>
        
        {/* Hide Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose?.() }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: darkMode ? '#5a5650' : '#aaa59c',
            padding: '4px 6px',
            marginLeft: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Hide Construction Steps"
        >
          ✕
        </button>
      </div>

      {/* ── Steps list with vertical timeline ── */}
      {!collapsed && (
        <div
          style={{
            overflowY: 'auto',
            padding: '12px 12px',
            flex: 1,
            minHeight: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: darkMode ? '#2a2824 transparent' : '#d0ccc4 transparent',
          }}
        >
          {steps.map((step, i) => {
            const isActive = isAnimating && i === activeStepIdx
            const isPast = isAnimating ? i < activeStepIdx : true
            const isLast = i === steps.length - 1

            return (
              <div
                key={i}
                onClick={() => onStepClick(i)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  position: 'relative',
                  paddingBottom: isLast ? 0 : 16,
                  transition: 'opacity 0.2s ease',
                  opacity: isAnimating && !isPast && !isActive ? 0.35 : 1,
                  cursor: 'pointer',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                {/* Timeline column — circle + connecting line */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {/* Step number circle */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 2,
                      color: isActive
                        ? '#fff'
                        : darkMode ? '#6a6560' : '#999590',
                      background: isActive
                        ? accentColor
                        : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: isActive
                        ? 'none'
                        : darkMode ? '1.5px solid #2a2824' : '1.5px solid #ddd8d0',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive
                        ? `0 2px 8px ${accentColor}40`
                        : 'none',
                    }}
                  >
                    {i + 1}
                  </div>

                  {/* Connecting line to next step */}
                  {!isLast && (
                    <div
                      style={{
                        width: 1.5,
                        flex: 1,
                        minHeight: 8,
                        background: darkMode
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.08)',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div style={{ flex: 1, minWidth: 0, padding: '2px 0' }}>
                  {/* Top row: operation badge + value */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span
                      className={step.meta.colorClass}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        lineHeight: '16px',
                      }}
                    >
                      {step.meta.icon} {step.meta.label}
                    </span>

                    {/* NFA: value for literals */}
                    {!isDFA && step.type === 'char' && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: darkMode ? '#d0ccb8' : '#2d2a24',
                          letterSpacing: '0.02em',
                        }}
                      >
                        &apos;{step.value}&apos;
                      </span>
                    )}

                    {/* DFA: state label */}
                    {isDFA && step.label && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: darkMode ? '#8ab4d8' : '#3a5a8c',
                        }}
                      >
                        {step.dfaId !== undefined ? `D${step.dfaId}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Thompson rule name (NFA only) */}
                  {!isDFA && step.rule && (
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        fontStyle: 'italic',
                        lineHeight: 1.3,
                        color: darkMode ? '#8a8578' : '#9a9590',
                        margin: '1px 0 4px 0',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {step.rule}
                    </p>
                  )}

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 10,
                      lineHeight: 1.5,
                      color: darkMode ? '#7a756a' : '#6a655a',
                      margin: 0,
                      wordBreak: 'break-word',
                    }}
                  >
                    {step.description}
                  </p>

                  {/* NFA: State range badge */}
                  {!isDFA && step.stateRangeLabels && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 5,
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 4,
                        color: darkMode ? '#6fba90' : '#2d6a4f',
                        background: darkMode ? 'rgba(45,106,79,0.15)' : 'rgba(45,106,79,0.08)',
                        border: darkMode ? '1px solid rgba(45,106,79,0.25)' : '1px solid rgba(45,106,79,0.15)',
                      }}
                    >
                      {step.stateRangeLabels[0]}
                      {step.stateRangeLabels[1] !== step.stateRangeLabels[0] && `–${step.stateRangeLabels[1]}`}
                    </span>
                  )}

                  {/* DFA: NFA set badge + accept flag */}
                  {isDFA && step.nfaSet && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: 3,
                          color: darkMode ? '#8ab4d8' : '#3a5a8c',
                          background: darkMode ? 'rgba(58,90,140,0.15)' : 'rgba(58,90,140,0.08)',
                          border: darkMode ? '1px solid rgba(58,90,140,0.25)' : '1px solid rgba(58,90,140,0.15)',
                        }}
                      >
                        {'{' + step.nfaSet.map(id => 'q' + id).join(',') + '}'}
                      </span>
                      {step.isAccept && (
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 3,
                            color: darkMode ? '#6fba90' : '#2d6a4f',
                            background: darkMode ? 'rgba(45,106,79,0.18)' : 'rgba(45,106,79,0.10)',
                            border: darkMode ? '1px solid rgba(45,106,79,0.3)' : '1px solid rgba(45,106,79,0.2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          Accept
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Inline styles for step badges + animation ── */}
      <style>{`
        .step-literal  { color: #2d6a4f; background: rgba(45,106,79,.10); border: 1px solid rgba(45,106,79,.20); }
        .step-union    { color: #8c3a2e; background: rgba(140,58,46,.10); border: 1px solid rgba(140,58,46,.20); }
        .step-concat   { color: #7a5a10; background: rgba(122,90,16,.10); border: 1px solid rgba(122,90,16,.20); }
        .step-star     { color: #1e4f8c; background: rgba(30,79,140,.10); border: 1px solid rgba(30,79,140,.20); }
        .step-plus     { color: #5a1e8c; background: rgba(90,30,140,.10); border: 1px solid rgba(90,30,140,.20); }
        .step-optional { color: #8c5a1e; background: rgba(140,90,30,.10); border: 1px solid rgba(140,90,30,.20); }

        .step-dfa-closure { color: #3a5a8c; background: rgba(58,90,140,.10); border: 1px solid rgba(58,90,140,.20); }
        .step-dfa-move    { color: #5a3a8c; background: rgba(90,58,140,.10); border: 1px solid rgba(90,58,140,.20); }
        .step-dfa-new     { color: #3a5a8c; background: rgba(58,90,140,.10); border: 1px solid rgba(58,90,140,.20); }
        .step-dfa-trans   { color: #2d6a4f; background: rgba(45,106,79,.10); border: 1px solid rgba(45,106,79,.20); }
        .step-dfa-done    { color: #2d6a4f; background: rgba(45,106,79,.12); border: 1px solid rgba(45,106,79,.22); }

        .dark-steps .step-literal  { color: #6fba90; background: rgba(45,106,79,.18); border-color: rgba(45,106,79,.30); }
        .dark-steps .step-union    { color: #d97868; background: rgba(140,58,46,.18); border-color: rgba(140,58,46,.30); }
        .dark-steps .step-concat   { color: #c8a34f; background: rgba(122,90,16,.18); border-color: rgba(122,90,16,.30); }
        .dark-steps .step-star     { color: #6a9ed8; background: rgba(30,79,140,.18); border-color: rgba(30,79,140,.30); }
        .dark-steps .step-plus     { color: #a878d8; background: rgba(90,30,140,.18); border-color: rgba(90,30,140,.30); }
        .dark-steps .step-optional { color: #d8a056; background: rgba(140,90,30,.18); border-color: rgba(140,90,30,.30); }

        .dark-steps .step-dfa-closure { color: #8ab4d8; background: rgba(58,90,140,.18); border-color: rgba(58,90,140,.30); }
        .dark-steps .step-dfa-move    { color: #a878d8; background: rgba(90,58,140,.18); border-color: rgba(90,58,140,.30); }
        .dark-steps .step-dfa-new     { color: #8ab4d8; background: rgba(58,90,140,.18); border-color: rgba(58,90,140,.30); }
        .dark-steps .step-dfa-trans   { color: #6fba90; background: rgba(45,106,79,.18); border-color: rgba(45,106,79,.30); }
        .dark-steps .step-dfa-done    { color: #6fba90; background: rgba(45,106,79,.20); border-color: rgba(45,106,79,.35); }

        @keyframes steps-slide-in {
          from { transform: translateX(12px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }

        .construction-steps-panel:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  )
}
