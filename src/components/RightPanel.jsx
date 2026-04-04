import CanvasPanel from './CanvasPanel'
import TransitionTable from './TransitionTable'

const TABS = [
  { id: 'nfa',   label: 'ε-NFA',            activeClass: 'tab-nfa-active' },
  { id: 'dfa',   label: 'DFA',              activeClass: 'tab-dfa-active' },
  { id: 'table', label: 'Transition Table', activeClass: 'tab-table-active' },
]

/**
 * RightPanel.jsx
 * Tab bar + three panels: NFA canvas, DFA canvas, Transition Table.
 */
export default function RightPanel({
  regexVal,
  activeTab, onTabChange,
  nfaSvgData,
  dfaSvgData,
  dfaHighlight,
  nfaTableData,
  dfaRaw,
  liveNfaTableData,
  liveDfaTableData,
  alphabet,
  isAnimating,
  animIsDFA,
  animStep,
  totalAnimSteps,
  darkMode,
  postfix,
  nfaLabelMap,
  hasSteps,
  stepsHidden,
  onToggleSteps,
}) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden flex-1 md:h-full md:flex-none">
      {/* ── Tab bar ── */}
      <div className="flex flex-shrink-0 border-b border-border dark:border-[#2a2824] bg-surface dark:bg-[#16140f] px-6 items-center">
        {TABS.map(({ id, label, activeClass }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`px-5 py-3.5 font-mono text-xs font-bold tracking-widest uppercase text-muted dark:text-[#5a5650] border-b-2 border-transparent transition-all hover:text-ink dark:hover:text-[#e8e4dc] cursor-pointer bg-transparent ${activeTab === id ? activeClass : ''}`}
          >
            {label}
          </button>
        ))}

        {/* Live step counter during animation */}
        {isAnimating && (
          <div className="ml-auto flex items-center gap-2 pr-2">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: animIsDFA ? '#3a5a8c' : '#2d6a4f' }} />
            <span className="font-mono text-[0.65rem] text-muted">
              {animIsDFA ? 'DFA' : 'NFA'} — state {animStep + 1} / {totalAnimSteps}
            </span>
          </div>
        )}
        
        {/* Toggle Steps Button */}
        {hasSteps && (
          <button
            onClick={onToggleSteps}
            className={`ml-auto md:ml-4 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wide border rounded transition-colors ${
              stepsHidden
                ? 'text-accent border-accent/30 hover:bg-accent/10 dark:text-[#a878d8] dark:border-[#a878d8]/30 dark:hover:bg-[#a878d8]/10'
                : 'text-muted border-border/50 hover:text-ink hover:border-border dark:text-[#5a5650] dark:border-[#2a2824] dark:hover:text-[#e8e4dc]'
            }`}
            title={stepsHidden ? 'Show Construction Steps' : 'Hide Construction Steps'}
          >
            {stepsHidden ? '+ Steps' : '- Steps'}
          </button>
        )}
      </div>

      {/* ── Panels ── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'nfa' && (
          <CanvasPanel
            regexVal={regexVal}
            svgData={nfaSvgData}
            isDFA={false}
            highlightPath={null}
            tableData={liveNfaTableData}
            alphabet={alphabet}
            isAnimating={isAnimating && !animIsDFA}
            darkMode={darkMode}
            postfix={postfix}
            animStep={animStep}
            totalAnimSteps={totalAnimSteps}
            nfaLabelMap={nfaLabelMap}
          />
        )}

        {activeTab === 'dfa' && (
          <CanvasPanel
            regexVal={regexVal}
            svgData={dfaSvgData}
            isDFA={true}
            highlightPath={isAnimating ? null : dfaHighlight}
            tableData={liveDfaTableData}
            alphabet={alphabet}
            isAnimating={isAnimating && animIsDFA}
            darkMode={darkMode}
            dfaRaw={dfaRaw}
            animStep={animStep}
            totalAnimSteps={totalAnimSteps}
            nfaLabelMap={nfaLabelMap}
          />
        )}

        {activeTab === 'table' && (
          <TransitionTable
            regexVal={regexVal}
            nfaData={nfaTableData}
            dfaData={dfaRaw}
            alphabet={alphabet}
            nfaSvgData={nfaSvgData}
            dfaSvgData={dfaSvgData}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  )
}