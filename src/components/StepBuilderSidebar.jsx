import { useState, useRef, useEffect, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   Step metadata
   ═══════════════════════════════════════════════════════════════════════════ */

const STEP_META = {
  char:   { label: 'Literal',        icon: 'α', color: '#2d6a4f', bg: 'rgba(45,106,79,0.10)',  border: 'rgba(45,106,79,0.25)' },
  union:  { label: 'Union (+)',      icon: '+', color: '#8c3a2e', bg: 'rgba(140,58,46,0.10)', border: 'rgba(140,58,46,0.25)' },
  concat: { label: 'Concatenation',  icon: '.', color: '#7a5a10', bg: 'rgba(122,90,16,0.10)', border: 'rgba(122,90,16,0.25)' },
  star:   { label: 'Kleene Star (*)', icon: '*', color: '#1e4f8c', bg: 'rgba(30,79,140,0.10)',  border: 'rgba(30,79,140,0.25)' },
}
const DARK_STEP_META = {
  char:   { color: '#6fba90', bg: 'rgba(45,106,79,0.20)',  border: 'rgba(45,106,79,0.35)' },
  union:  { color: '#d97868', bg: 'rgba(140,58,46,0.20)',  border: 'rgba(140,58,46,0.35)' },
  concat: { color: '#c8a34f', bg: 'rgba(122,90,16,0.20)',  border: 'rgba(122,90,16,0.35)' },
  star:   { color: '#6a9ed8', bg: 'rgba(30,79,140,0.20)',  border: 'rgba(30,79,140,0.35)' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   Role badge colours for connection entries
   ═══════════════════════════════════════════════════════════════════════════ */
const ROLE_STYLE = {
  'literal': { label: 'read',    bg: 'rgba(45,106,79,0.13)',  color: '#2d6a4f',  border: 'rgba(45,106,79,0.25)' },
  'entry-1': { label: 'ε entry', bg: 'rgba(30,79,140,0.12)',  color: '#1e4f8c',  border: 'rgba(30,79,140,0.25)' },
  'entry-2': { label: 'ε entry', bg: 'rgba(30,79,140,0.12)',  color: '#1e4f8c',  border: 'rgba(30,79,140,0.25)' },
  'join-1':  { label: 'ε join',  bg: 'rgba(140,58,46,0.12)',  color: '#8c3a2e',  border: 'rgba(140,58,46,0.25)' },
  'join-2':  { label: 'ε join',  bg: 'rgba(140,58,46,0.12)',  color: '#8c3a2e',  border: 'rgba(140,58,46,0.25)' },
  'bridge':  { label: 'merge',   bg: 'rgba(122,90,16,0.12)',  color: '#7a5a10',  border: 'rgba(122,90,16,0.25)' },
  'loop':    { label: 'ε loop',  bg: 'rgba(90,30,140,0.12)',  color: '#5a1e8c',  border: 'rgba(90,30,140,0.25)' },
  'exit':    { label: 'ε exit',  bg: 'rgba(30,79,140,0.12)',  color: '#1e4f8c',  border: 'rgba(30,79,140,0.25)' },
  'skip':    { label: 'ε skip',  bg: 'rgba(45,106,79,0.12)',  color: '#2d6a4f',  border: 'rgba(45,106,79,0.25)' },
}
const ROLE_STYLE_DARK = {
  'literal': { bg: 'rgba(45,106,79,0.20)',  color: '#6fba90',  border: 'rgba(45,106,79,0.35)' },
  'entry-1': { bg: 'rgba(30,79,140,0.20)',  color: '#6a9ed8',  border: 'rgba(30,79,140,0.35)' },
  'entry-2': { bg: 'rgba(30,79,140,0.20)',  color: '#6a9ed8',  border: 'rgba(30,79,140,0.35)' },
  'join-1':  { bg: 'rgba(140,58,46,0.20)',  color: '#d97868',  border: 'rgba(140,58,46,0.35)' },
  'join-2':  { bg: 'rgba(140,58,46,0.20)',  color: '#d97868',  border: 'rgba(140,58,46,0.35)' },
  'bridge':  { bg: 'rgba(122,90,16,0.20)',  color: '#c8a34f',  border: 'rgba(122,90,16,0.35)' },
  'loop':    { bg: 'rgba(90,30,140,0.20)',  color: '#a878d8',  border: 'rgba(90,30,140,0.35)' },
  'exit':    { bg: 'rgba(30,79,140,0.20)',  color: '#6a9ed8',  border: 'rgba(30,79,140,0.35)' },
  'skip':    { bg: 'rgba(45,106,79,0.20)',  color: '#6fba90',  border: 'rgba(45,106,79,0.35)' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   Rule Diagram — crisp visual showing the current rule structure
   ═══════════════════════════════════════════════════════════════════════════ */
function RuleDiagram({ type, darkMode, charLabel = 'a' }) {
  const fg      = darkMode ? '#a09a90' : '#5a554a'
  const accent  = darkMode ? '#6fba90' : '#2d6a4f'
  const eps     = darkMode ? '#6a9ed8' : '#3a5a8c'
  const dim     = darkMode ? '#4a4640' : '#c0bdb5'

  const defs = (id, color) => (
    <defs>
      <marker id={`arr-${id}`} markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
        <polygon points="0 0, 6 2.5, 0 5" fill={color} />
      </marker>
    </defs>
  )

  switch (type) {
    case 'char':
      return (
        <svg viewBox="0 0 240 60" width="100%" height="55">
          {defs('ch', fg)}
          <circle cx="40" cy="30" r="18" fill="none" stroke={accent} strokeWidth="2"/>
          <text x="40" y="34" textAnchor="middle" fill={fg} fontSize="9" fontFamily="monospace" fontWeight="600">q0</text>
          <line x1="58" y1="30" x2="118" y2="30" stroke={fg} strokeWidth="1.5" markerEnd="url(#arr-ch)"/>
          <text x="88" y="22" textAnchor="middle" fill={accent} fontSize="13" fontFamily="monospace" fontWeight="800">{charLabel}</text>
          <circle cx="140" cy="30" r="18" fill="none" stroke={accent} strokeWidth="2"/>
          <circle cx="140" cy="30" r="13" fill="none" stroke={accent} strokeWidth="1"/>
          <text x="140" y="34" textAnchor="middle" fill={fg} fontSize="9" fontFamily="monospace" fontWeight="600">q1</text>
          <text x="180" y="34" fill={dim} fontSize="8" fontFamily="monospace">← accept</text>
        </svg>
      )

    case 'union':
      return (
        <svg viewBox="0 0 340 140" width="100%" height="120">
          {defs('un', eps)}
          <circle cx="30" cy="70" r="16" fill="none" stroke={accent} strokeWidth="2"/>
          <text x="30" y="74" textAnchor="middle" fill={fg} fontSize="8" fontFamily="monospace" fontWeight="700">new S</text>

          <line x1="46" y1="62" x2="90" y2="35" stroke={eps} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr-un)"/>
          <text x="64" y="43" textAnchor="middle" fill={eps} fontSize="10" fontFamily="monospace" fontWeight="700">ε</text>

          <rect x="94" y="15" width="130" height="35" rx="6" fill={darkMode ? 'rgba(45,106,79,0.12)' : 'rgba(45,106,79,0.06)'} stroke={dim} strokeWidth="1.2" strokeDasharray="4,2"/>
          <text x="159" y="37" textAnchor="middle" fill={fg} fontSize="10" fontFamily="monospace" fontWeight="600">NFA(R₁)</text>

          <line x1="46" y1="78" x2="90" y2="104" stroke={eps} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr-un)"/>
          <text x="64" y="100" textAnchor="middle" fill={eps} fontSize="10" fontFamily="monospace" fontWeight="700">ε</text>

          <rect x="94" y="88" width="130" height="35" rx="6" fill={darkMode ? 'rgba(140,58,46,0.12)' : 'rgba(140,58,46,0.06)'} stroke={dim} strokeWidth="1.2" strokeDasharray="4,2"/>
          <text x="159" y="110" textAnchor="middle" fill={fg} fontSize="10" fontFamily="monospace" fontWeight="600">NFA(R₂)</text>

          <line x1="224" y1="33" x2="273" y2="62" stroke={eps} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr-un)"/>
          <text x="254" y="44" textAnchor="middle" fill={eps} fontSize="10" fontFamily="monospace" fontWeight="700">ε</text>
          <line x1="224" y1="105" x2="273" y2="78" stroke={eps} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr-un)"/>
          <text x="254" y="100" textAnchor="middle" fill={eps} fontSize="10" fontFamily="monospace" fontWeight="700">ε</text>

          <circle cx="291" cy="70" r="16" fill="none" stroke={accent} strokeWidth="2"/>
          <circle cx="291" cy="70" r="11" fill="none" stroke={accent} strokeWidth="1"/>
          <text x="291" y="74" textAnchor="middle" fill={fg} fontSize="8" fontFamily="monospace" fontWeight="700">new A</text>
        </svg>
      )

    case 'concat':
      return (
        <svg viewBox="0 0 300 65" width="100%" height="55">
          <circle cx="16" cy="32" r="10" fill="none" stroke={fg} strokeWidth="1" strokeDasharray="3,2"/>
          <text x="16" y="36" textAnchor="middle" fill={fg} fontSize="7" fontFamily="monospace">S₁</text>
          <rect x="28" y="14" width="100" height="36" rx="5" fill={darkMode ? 'rgba(45,106,79,0.12)' : 'rgba(45,106,79,0.06)'} stroke={dim} strokeWidth="1.2" strokeDasharray="3,2"/>
          <text x="78" y="36" textAnchor="middle" fill={fg} fontSize="10" fontFamily="monospace" fontWeight="600">NFA(R₁)</text>

          {/* merge node: overlapping circles */}
          <circle cx="128" cy="32" r="12" fill={darkMode ? '#1a1814' : '#ffffff'} stroke={accent} strokeWidth="2.5"/>
          <text x="128" y="28" textAnchor="middle" fill={accent} fontSize="7" fontFamily="monospace" fontWeight="700">A₁=S₂</text>
          <text x="128" y="38" textAnchor="middle" fill={eps} fontSize="7" fontFamily="monospace">merge</text>

          <rect x="140" y="14" width="100" height="36" rx="5" fill={darkMode ? 'rgba(122,90,16,0.12)' : 'rgba(122,90,16,0.06)'} stroke={dim} strokeWidth="1.2" strokeDasharray="3,2"/>
          <text x="190" y="36" textAnchor="middle" fill={fg} fontSize="10" fontFamily="monospace" fontWeight="600">NFA(R₂)</text>
          <circle cx="252" cy="32" r="10" fill="none" stroke={accent} strokeWidth="1.5"/>
          <circle cx="252" cy="32" r="6" fill="none" stroke={accent} strokeWidth="1"/>
          <text x="252" y="36" textAnchor="middle" fill={fg} fontSize="7" fontFamily="monospace">A₂</text>
        </svg>
      )

    case 'star':
      return (
        <svg viewBox="0 0 310 110" width="100%" height="95">
          {defs('st', eps)}
          <circle cx="26" cy="55" r="14" fill="none" stroke={accent} strokeWidth="2"/>
          <text x="26" y="59" textAnchor="middle" fill={fg} fontSize="8" fontFamily="monospace" fontWeight="700">S</text>

          <rect x="50" y="32" width="140" height="46" rx="6" fill={darkMode ? 'rgba(30,79,140,0.10)' : 'rgba(30,79,140,0.05)'} stroke={dim} strokeWidth="1.2" strokeDasharray="3,2"/>
          <text x="120" y="59" textAnchor="middle" fill={fg} fontSize="10" fontFamily="monospace" fontWeight="600">NFA(R)</text>

          {/* skip arc — top */}
          <path d="M 40 45 Q 130 4 222 45" fill="none" stroke={eps} strokeWidth="1.5" strokeDasharray="5,2" markerEnd="url(#arr-st)"/>
          <text x="132" y="10" textAnchor="middle" fill={eps} fontSize="9" fontFamily="monospace" fontWeight="700">ε skip</text>

          {/* exit right */}
          <line x1="190" y1="55" x2="220" y2="55" stroke={eps} strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#arr-st)"/>
          <text x="205" y="48" textAnchor="middle" fill={eps} fontSize="8" fontFamily="monospace" fontWeight="700">ε</text>

          {/* loop arc — bottom */}
          <path d="M 190 70 Q 120 108 50 70" fill="none" stroke={eps} strokeWidth="1.5" strokeDasharray="5,2" markerEnd="url(#arr-st)"/>
          <text x="120" y="105" textAnchor="middle" fill={eps} fontSize="9" fontFamily="monospace" fontWeight="700">ε loop</text>

          <circle cx="236" cy="55" r="14" fill="none" stroke={accent} strokeWidth="2"/>
          <circle cx="236" cy="55" r="9" fill="none" stroke={accent} strokeWidth="1"/>
          <text x="236" y="59" textAnchor="middle" fill={fg} fontSize="8" fontFamily="monospace" fontWeight="700">A</text>
        </svg>
      )

    default:
      return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Connection entry row — shows one edge with a badge
   ═══════════════════════════════════════════════════════════════════════════ */
function ConnectionRow({ conn, darkMode }) {
  const rs = darkMode ? ROLE_STYLE_DARK[conn.role] : ROLE_STYLE[conn.role]
  const baseStyle  = rs || { bg: 'transparent', color: darkMode ? '#a09a90' : '#5a554a', border: 'transparent' }
  const isMerge   = conn.symbol === 'merge'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
      borderRadius: 7, background: baseStyle.bg, border: `1px solid ${baseStyle.border}`,
      marginBottom: 5,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: baseStyle.border,
        color: baseStyle.color, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
        letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {ROLE_STYLE[conn.role]?.label || conn.role}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.5, color: darkMode ? '#c8c4bc' : '#3a3730', fontFamily: 'monospace' }}>
        {isMerge
          ? <>{conn.desc}</>
          : <>
              <span style={{ color: baseStyle.color, fontWeight: 700 }}>q{conn.from}</span>
              <span style={{ color: darkMode ? '#6a9ed8' : '#3a5a8c', fontWeight: 800, margin: '0 4px' }}>
                {conn.symbol === 'ε' ? '─ε─▶' : `─${conn.symbol}─▶`}
              </span>
              <span style={{ color: baseStyle.color, fontWeight: 700 }}>q{conn.to}</span>
            </>
        }
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main sidebar component
   ═══════════════════════════════════════════════════════════════════════════ */
const AUTOPLAY_INTERVAL = 2800

export default function StepBuilderSidebar({
  constructionSteps,
  builderStep,
  setBuilderStep,
  darkMode,
  onClose,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef(null)

  const steps      = constructionSteps || []
  const totalSteps = steps.length

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      timerRef.current = setInterval(() => {
        setBuilderStep(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); clearInterval(timerRef.current); return prev }
          return prev + 1
        })
      }, AUTOPLAY_INTERVAL)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, totalSteps, setBuilderStep])

  const goNext     = useCallback(() => setBuilderStep(s => Math.min(s + 1, totalSteps - 1)), [totalSteps, setBuilderStep])
  const goPrev     = useCallback(() => setBuilderStep(s => Math.max(s - 1, 0)), [setBuilderStep])
  const togglePlay = useCallback(() => {
    setIsPlaying(p => { if (!p && builderStep >= totalSteps - 1) setBuilderStep(0); return !p })
  }, [builderStep, totalSteps, setBuilderStep])

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goPrev() }
      if (e.key === ' ')                                      { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [goNext, goPrev, togglePlay])

  const step = constructionSteps?.[builderStep]
  if (!step) return null

  const stepType = step.parentType || step.type
  const meta        = STEP_META[stepType]
  const darkMeta    = DARK_STEP_META[stepType]
  const stepColor   = darkMode ? darkMeta.color : meta.color
  const stepBg      = darkMode ? darkMeta.bg    : meta.bg
  const stepBorder  = darkMode ? darkMeta.border : meta.border
  const isFinalStep = builderStep === totalSteps - 1
  const conns = step.connections || []
  const lbls = step.inputLabels || []

  const cardBg      = darkMode ? 'rgba(255,255,255,0.03)' : '#ffffff'
  const cardBorder  = darkMode ? '#2a2824' : '#e0ddd6'
  const textMid     = darkMode ? '#a09a90' : '#5a554a'
  const textHead    = darkMode ? '#e8e4dc' : '#1e1c18'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden',
      background: darkMode ? '#12100d' : '#f8f7f4',
      borderLeft: `1px solid ${darkMode ? '#2a2824' : '#e0ddd6'}`,
      color: textHead,
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>Step Builder</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: textMid }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Progress bar + counter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Step {builderStep + 1} of {totalSteps}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2, height: 4, borderRadius: 2, overflow: 'hidden', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            {steps.map((s, i) => {
              const stype = s.parentType || s.type
              const m = darkMode ? DARK_STEP_META[stype] : STEP_META[stype]
              return (
                <div key={i} onClick={() => { setBuilderStep(i); setIsPlaying(false) }}
                  style={{
                    flex: 1, borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s',
                    background: i <= builderStep ? m.color : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    opacity: i <= builderStep ? 1 : 0.4,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Step badge + expression */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            color: stepColor, background: stepBg, border: `1px solid ${stepBorder}`,
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          }}>
            {meta.icon} {meta.label}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: textHead, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {step.exprLabel}
          </span>
        </div>

        {isFinalStep && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: darkMode ? 'rgba(45,106,79,0.15)' : 'rgba(45,106,79,0.08)',
            border: darkMode ? '1px solid rgba(45,106,79,0.30)' : '1px solid rgba(45,106,79,0.20)',
            color: darkMode ? '#6fba90' : '#2d6a4f', fontSize: 13, fontWeight: 600
          }}>
            ✓ Construction complete — the full NFA is ready!
          </div>
        )}

        {/* ── Prose explanation ── */}
        <div className={`p-4 ${darkMode ? 'bg-[#1a1814]' : 'bg-[#faf9f6]'} rounded-xl border ${darkMode ? 'border-[#2a2824]' : 'border-border'} text-sm leading-relaxed ${darkMode ? 'text-[#c8c4bc]' : 'text-ink/80'} shadow-sm`}>
          {stepType === 'char' && (
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-[#e8e4dc]' : 'text-ink'}`}>Build NFA for literal '{step.exprLabel}'</p>
              <ul className="list-disc pl-5 space-y-1.5 opacity-90 marker:text-[#2d6a4f]">
                <li>Create a new start state q{conns[0]?.from}.</li>
                <li>Create a new accept state q{conns[0]?.to}.</li>
                <li>Connect them with a '{step.exprLabel}' transition — this matches exactly one '{step.exprLabel}' character.</li>
              </ul>
            </div>
          )}

          {stepType === 'union' && (
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-[#e8e4dc]' : 'text-ink'}`}>Union — combine NFA({lbls[0]}) and NFA({lbls[1]}) using +</p>
              <ul className="list-disc pl-5 space-y-1.5 opacity-90 marker:text-[#2d6a4f]">
                {step.type === 'union-step' ? (
                  <>
                    <li>Create a brand-new start state.</li>
                    <li>Connect the new start → NFA({lbls[0]}) start with an ε transition.</li>
                    <li>Connect the new start → NFA({lbls[1]}) start with an ε transition.</li>
                  </>
                ) : (
                  <>
                    <li>Create a brand-new accept state.</li>
                    <li>Connect NFA({lbls[0]}) accept → the new accept state with an ε transition.</li>
                    <li>Connect NFA({lbls[1]}) accept → the new accept state with an ε transition.</li>
                    <li>Now the machine can enter either branch non-deterministically.</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {stepType === 'concat' && (
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-[#e8e4dc]' : 'text-ink'}`}>Concatenation — sequence NFA({lbls[0]}) then NFA({lbls[1]})</p>
              <ul className="list-disc pl-5 space-y-1.5 opacity-90 marker:text-[#2d6a4f]">
                <li>Merge NFA({lbls[0]}) accept state directly into NFA({lbls[1]}) start state.</li>
                <li>This ensures the regex must match NFA({lbls[0]}) strictly followed by NFA({lbls[1]}).</li>
              </ul>
            </div>
          )}

          {stepType === 'star' && (
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-[#e8e4dc]' : 'text-ink'}`}>Kleene Star — make NFA({lbls[0]}) repeat zero or more times</p>
              <ul className="list-disc pl-5 space-y-1.5 opacity-90 marker:text-[#2d6a4f]">
                {step.type === 'star-step' && step.exprLabel.includes('Loop') && (
                  <li>Add an ε loop: NFA({lbls[0]}) accept → NFA({lbls[0]}) start (so it can repeat).</li>
                )}
                {step.type === 'star-step' && step.exprLabel.includes('Exit') && (
                  <>
                    <li>Add a new accept state.</li>
                    <li>Add an ε exit: NFA({lbls[0]}) accept → new accept (so it can stop).</li>
                  </>
                )}
                {step.type === 'star' && (
                  <li>Add an ε skip: NFA({lbls[0]}) start → new accept (so it can be skipped entirely, matching zero times).</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Connections / edges added this step ── */}
        {conns.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '12px 14px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Connections added this step
            </div>
            {conns.map((c, i) => (
              <ConnectionRow key={i} conn={c} darkMode={darkMode} />
            ))}
          </div>
        )}

        {/* ── Rule diagram ── */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '12px 14px 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Thompson's rule structure
          </div>
          <div className={`p-4 ${darkMode ? 'bg-[#1a1814]' : 'bg-[#faf9f6]'} rounded-xl flex justify-center items-center overflow-x-auto`}>
            <RuleDiagram type={stepType} charLabel={step.type === 'char' ? step.exprLabel : null} darkMode={darkMode} />
          </div>
        </div>

        {/* spacer */}
        <div style={{ height: 8 }}/>
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding: '12px 14px 18px', flexShrink: 0,
        borderTop: `1px solid ${cardBorder}`,
        background: darkMode ? '#161410' : '#f0eee8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {[
            { icon: '⏮', onClick: () => { setBuilderStep(0); setIsPlaying(false) }, disabled: builderStep === 0, title: 'First step' },
            { icon: '◀', onClick: goPrev,    disabled: builderStep === 0,            title: 'Prev (←)', size: 40 },
          ].map(({ icon, onClick, disabled, title, size }) => (
            <button key={icon} onClick={onClick} disabled={disabled} title={title} style={{
              width: size || 34, height: size || 34, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
              border: `1px solid ${disabled ? (darkMode ? '#2a2824' : '#ddd8d0') : (darkMode ? '#3a3830' : '#d0ccc4')}`,
              background: 'transparent', fontSize: 14,
              color: disabled ? (darkMode ? '#3a3830' : '#d0ccc4') : (darkMode ? '#a09a90' : '#5a554a'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
              {icon}
            </button>
          ))}

          <button onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} style={{
            width: 48, height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
            background: isPlaying
              ? (darkMode ? 'rgba(140,58,46,0.3)' : 'rgba(140,58,46,0.12)')
              : (darkMode ? 'rgba(45,106,79,0.3)' : 'rgba(45,106,79,0.12)'),
            color: isPlaying ? (darkMode ? '#d97868' : '#8c3a2e') : (darkMode ? '#6fba90' : '#2d6a4f'),
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', boxShadow: `0 2px 8px ${isPlaying ? 'rgba(140,58,46,0.2)' : 'rgba(45,106,79,0.2)'}`,
          }}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          {[
            { icon: '▶', onClick: goNext,          disabled: builderStep >= totalSteps - 1, title: 'Next (→)', size: 40 },
            { icon: '⏭', onClick: () => { setBuilderStep(totalSteps - 1); setIsPlaying(false) }, disabled: builderStep >= totalSteps - 1, title: 'Last step' },
          ].map(({ icon, onClick, disabled, title, size }) => (
            <button key={icon + '-r'} onClick={onClick} disabled={disabled} title={title} style={{
              width: size || 34, height: size || 34, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
              border: `1px solid ${disabled ? (darkMode ? '#2a2824' : '#ddd8d0') : (darkMode ? '#3a3830' : '#d0ccc4')}`,
              background: 'transparent', fontSize: 14,
              color: disabled ? (darkMode ? '#3a3830' : '#d0ccc4') : (darkMode ? '#a09a90' : '#5a554a'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
