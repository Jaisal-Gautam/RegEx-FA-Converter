import { useState, useMemo, useEffect, useRef } from 'react'
import AutomatonSVG from './AutomatonSVG'
import { compileRegexWithSteps, collectStates } from '../utils/thompson'
import { subsetConstruction } from '../utils/subset'
import { layoutNFA, layoutDFA, layoutSubNFA } from '../utils/layout'

const THOMPSON_CASES = {
  literal: {
    name: 'Character',
    regex: 'a',
    theory: 'The basic building block. A single character c creates two states (s, a) with a transition s \u2192 a.',
  },
  concat: {
    name: 'Concatenation',
    regex: 'ab',
    theory: 'To concatenate NFAs for A and B, we connect the accept state of A to the start state of B via an ε-transition, effectively joining them in series.',
  },
  union: {
    name: 'Union (OR)',
    regex: 'a|b',
    theory: 'For A | B, we create a new start state that branches to both NFAs via ε-transitions. Both NFAs then merge into a single new accept state.',
  },
  star: {
    name: 'Kleene Star (*)',
    regex: 'a*',
    theory: 'Represents zero or more occurrences. We add a loop-back from the accept to the start for repetition, and a "skip" transition to support the empty string.',
  }
}

const SUBSET_CASES = {
  trap: {
    name: 'Trap State',
    regex: 'a',
    theory: 'In a DFA, every state must have a transition for every alphabet symbol. If an NFA has no legal move, the DFA transitions to an explicit "Trap" (Dead) state.',
  },
  merging: {
    name: 'Merging Paths',
    regex: 'aa|ab',
    theory: 'Non-determinism often means moving to multiple states on one symbol. The subset algorithm merges these NFA states into a single DFA state.',
  },
  loops: {
    name: 'Epsilon Loops',
    regex: 'a*',
    theory: 'The ε-closure algorithm handles loops by recursively following all ε-transitions, effectively "collapsing" the loop into the initial state set.',
  }
}

const STEPS_DESC = {
  'char': (token) => `Basic Case: For symbol '${token.val}', we create a 2-state NFA segment. Transition: q(i) \u2192 q(j) on '${token.val}'.`,
  'concat': () => `Concatenation (A.B): We bridge the NFAs by adding an ε-transition from A's accept state to B's start state.`,
  'union-step': () => `Union (A|B) Step 1: Create a new start state and branch out to both NFAs using ε-transitions.`,
  'union': () => `Union (A|B) Step 2: Merge the accept states of both branches into a single global accept state via ε-transitions.`,
  'star-step': (token, step) => {
    if (step.exprLabel?.includes('New Accept')) return 'Star (*) Step 1: Create a new global accept state and add a "skip" (ε) from start to support zero repetitions.'
    if (step.exprLabel?.includes('Loop Back')) return 'Star (*) Step 2: Add a "loop" (ε) from the inner accept back to the inner start to allow repetition.'
    return 'Detailed Star Construction...'
  },
  'star': () => `Star (*) Step 3: Complete the construction by exit-bridging the inner accept to the global accept state.`,
  'dfa-start': () => `Step 1 (E-Closure): We start by taking the ε-closure of the NFA start state. This set {q0, ...} becomes DFA state D0.`,
  'dfa-move': (_, step) => `Step 2 (Move + Closure): From D${step.fromDfaState} on '${step.symbol}', the NFA could reach {${step.movedIds.map(id => `q${id}`).join(', ')}}. Their ε-closure results in DFA state D${step.targetDfaState}.`,
  'dfa-trap': () => `Step 3 (Completion): To ensure the DFA is "complete", we route all missing transitions for the alphabet to a Trap State.`,
}

export default function LearnModal({ darkMode, onClose }) {
  const [activeTab, setActiveTab] = useState('thompson')
  const [thompsonCaseId, setThompsonCaseId] = useState('literal')
  const [subsetCaseId, setSubsetCaseId] = useState('trap')
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef(null)

  const activeCase = activeTab === 'thompson' ? THOMPSON_CASES[thompsonCaseId] : SUBSET_CASES[subsetCaseId]
  const regex = activeCase.regex

  const data = useMemo(() => {
    try {
      const { nfa, constructionSteps } = compileRegexWithSteps(regex)
      const alphabet = ['a', 'b'] // Use fixed alphabet for edge cases
      const { dfaSteps } = subsetConstruction(nfa.start, collectStates(nfa.start), alphabet)
      return { constructionSteps, dfaSteps, error: null }
    } catch (e) {
      return { constructionSteps: [], dfaSteps: [], error: e.message }
    }
  }, [regex])

  const steps = activeTab === 'thompson' ? data.constructionSteps : data.dfaSteps
  // Sequential steps list
  const visibleSteps = useMemo(() => steps.slice(0, stepIndex + 1), [steps, stepIndex])
  const currentStep = steps[stepIndex]

  // Ref for auto-scrolling
  const stepsEndRef = useRef(null)
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleSteps.length])

  // Visualization Data
  const visData = useMemo(() => {
    if (!currentStep) return null
    const isDFA = activeTab === 'subset'
    const snapshot = currentStep.resultSnapshot || currentStep.stackSnapshot
    if (!snapshot) return null
    
    const states = snapshot.states
    const transitions = snapshot.transitions
    
    const pos = isDFA 
      ? layoutDFA(states, transitions)
      : layoutSubNFA(states, transitions, snapshot.startIds || snapshot.startId)

    return { states, transitions, pos, startId: snapshot.startIds?.[0] || snapshot.startId || 0, isDFA }
  }, [currentStep, activeTab])

  // Playback control with auto-loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStepIndex(prev => {
          if (prev < steps.length - 1) return prev + 1
          return 0 // Loop back to start
        })
      }, 1500)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, steps.length])

  // Reset step and auto-play when tab or regex changes
  useEffect(() => {
    setStepIndex(0)
    setIsPlaying(true)
  }, [activeTab, regex])

  const getStepDescription = (step) => {
    if (!step) return ''
    const fn = STEPS_DESC[step.type]
    if (typeof fn === 'function') return fn(step.token || {}, step)
    return step.exprLabel || 'Constructing...'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface dark:bg-[#16140f] w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border dark:border-[#2a2824]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border dark:border-[#2a2824] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold dark:text-[#e8e4dc]">🎓 Learn Automata</h2>
            <div className="flex bg-surface2 dark:bg-[#1e1c18] p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('thompson')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'thompson' ? 'bg-surface dark:bg-[#2a2824] shadow-sm text-accent' : 'text-muted hover:text-ink'}`}
              >
                Thompson
              </button>
              <button
                onClick={() => setActiveTab('subset')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'subset' ? 'bg-surface dark:bg-[#2a2824] shadow-sm text-accent' : 'text-muted hover:text-ink'}`}
              >
                Subset (NFA→DFA)
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface2 dark:hover:bg-[#1e1c18] rounded-full transition-colors text-muted">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Explanation */}
          <div className="w-full md:w-[350px] lg:w-[400px] border-r border-border dark:border-[#2a2824] p-6 flex flex-col bg-surface2/30 dark:bg-black/20">
            <div className="flex-1 overflow-hidden flex flex-col">
              <section className="mb-6">
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-2">Select Theory Case</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(activeTab === 'thompson' ? THOMPSON_CASES : SUBSET_CASES).map(([id, c]) => (
                    <button
                      key={id}
                      onClick={() => activeTab === 'thompson' ? setThompsonCaseId(id) : setSubsetCaseId(id)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        (activeTab === 'thompson' ? thompsonCaseId : subsetCaseId) === id 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-surface dark:bg-[#1e1c18] border-border dark:border-[#2a2824] text-muted hover:border-accent/50'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-left-4 duration-500">
                <div className="mb-4 flex-shrink-0">
                  <h3 className="text-lg font-bold dark:text-[#e8e4dc]">
                    {activeCase.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[0.6rem] font-bold text-muted uppercase">Regex:</span>
                    <code className="bg-surface dark:bg-[#1e1c18] px-2 py-0.5 rounded text-accent font-mono text-xs">{activeCase.regex}</code>
                  </div>
                  <p className="text-[0.75rem] text-ink dark:text-[#d0ccc4] leading-relaxed mt-2 italic">
                    {activeCase.theory}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-0">
                  {visibleSteps.map((step, idx) => {
                    const isLatest = idx === visibleSteps.length - 1
                    return (
                      <div 
                        key={`${activeTab}-${regex}-${idx}`}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          isLatest 
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' 
                            : 'bg-surface dark:bg-[#1e1c18] border-border dark:border-[#2a2824] opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
                            isLatest ? 'bg-emerald-500 text-white' : 'bg-surface2 dark:bg-[#2a2824] text-muted'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed text-ink dark:text-[#e8e4dc] break-words">
                              {getStepDescription(step)}
                            </p>
                            
                            {activeTab === 'subset' && step.closureIds && isLatest && (
                              <div className="mt-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-border/50">
                                <span className="text-[0.6rem] font-bold uppercase text-muted block mb-1">Epsilon-closure</span>
                                <code className="text-emerald-600 dark:text-emerald-400 font-bold text-xs break-all">
                                  {'{' + step.closureIds.map(id => `q${id}`).join(', ') + '}'}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {activeTab === 'subset' && visData?.transitions?.length > 0 && (
                    <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                      <span className="text-[0.6rem] font-bold uppercase text-muted block mb-2">Transitions Discovered So Far</span>
                      <div className="overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-[0.65rem]">
                        <table className="w-full text-left">
                          <thead className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-b border-emerald-500/20">
                            <tr>
                              <th className="px-2 py-1">From</th>
                              <th className="px-2 py-1">Input</th>
                              <th className="px-2 py-1">To</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-500/10">
                            {visData.transitions.map((t, idx) => (
                              <tr key={idx} className={idx === visData.transitions.length - 1 ? 'bg-emerald-500/10' : ''}>
                                <td className="px-2 py-1 font-mono">D{t.from}</td>
                                <td className="px-2 py-1 text-accent font-bold">{t.symbol}</td>
                                <td className="px-2 py-1 font-mono">D{t.to}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div ref={stepsEndRef} />
                </div>
              </section>

              <div className="hidden md:block pt-4 flex-shrink-0">
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-[0.7rem] text-orange-600 dark:text-orange-400">
                  <strong className="block mb-1">Concept:</strong> 
                  {activeTab === 'thompson' 
                    ? 'ε-transitions (dashed) allow the machine to move without consuming any input character.' 
                    : 'The Subset construction guarantees that the resulting DFA will have no ε-transitions.'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="pt-6 border-t border-border dark:border-[#2a2824] space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[0.65rem] font-bold text-muted uppercase">Step {stepIndex + 1} of {steps.length}</span>
                <div className="flex gap-1">
                  <button 
                    disabled={stepIndex === 0}
                    onClick={() => setStepIndex(prev => prev - 1)}
                    className="p-1.5 rounded-md border border-border dark:border-[#2a2824] hover:bg-surface dark:hover:bg-[#2a2824] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ←
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${isPlaying ? 'bg-orange-500 border-orange-600 text-white' : 'border-border dark:border-[#2a2824] hover:border-accent'}`}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button 
                    disabled={stepIndex === steps.length - 1}
                    onClick={() => setStepIndex(prev => prev + 1)}
                    className="p-1.5 rounded-md border border-border dark:border-[#2a2824] hover:bg-surface dark:hover:bg-[#2a2824] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="w-full bg-surface2 dark:bg-[#1e1c18] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Visualizer */}
          <div className="flex-1 relative bg-white dark:bg-[#0f0e0c] overflow-hidden">
            {visData ? (
              <AutomatonSVG
                key={`${activeTab}-${regex}-${stepIndex}`}
                states={visData.states}
                transitions={visData.transitions}
                pos={visData.pos}
                startId={visData.startId}
                acceptIds={new Set(visData.states.filter(s => s.isAccept).map(s => s.id))}
                isDFA={visData.isDFA}
                darkMode={darkMode}
                animKey={`${activeTab}-${stepIndex}`}
                newStateIds={new Set(visData.isDFA ? [currentStep.newDfaStateId, currentStep.targetDfaState].filter(id => id !== undefined) : [])}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted italic text-sm">
                No visualization available for this step.
              </div>
            )}
            
            {/* Visual Overlays */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {activeTab === 'subset' && currentStep?.movedIds?.length > 0 && (
                <div className="bg-surface/90 dark:bg-[#1e1c18]/90 backdrop-blur p-3 rounded-xl border border-border dark:border-[#2a2824] shadow-lg animate-in fade-in zoom-in duration-300">
                  <span className="text-[0.6rem] font-bold text-muted uppercase block">Moving from D{currentStep.fromDfaState} on '{currentStep.symbol}'</span>
                  <div className="flex gap-2 mt-1">
                    {currentStep.movedIds.map(id => (
                      <span key={id} className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-xs font-bold border border-accent/20">q{id}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
