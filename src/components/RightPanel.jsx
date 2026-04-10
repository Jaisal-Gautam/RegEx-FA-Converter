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
 * The NFA canvas automatically shows the sub-NFA result if the user is stepping in the builder.
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
  constructionSteps,
  builderStep,
  setBuilderStep,
}) {
  return (
    <div className="flex flex-col flex-1 min-h-[500px] md:min-h-0 overflow-hidden md:h-full md:flex-none">
      {/* ── Tab bar ── */}
      <div className="flex flex-shrink-0 border-b border-border dark:border-[#2a2824] bg-surface dark:bg-[#16140f] px-2 md:px-4 lg:px-6 items-center overflow-x-auto scrollbar-hide whitespace-nowrap">
        {TABS.map(({ id, label, activeClass }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`px-3 lg:px-5 py-3.5 font-mono text-xs font-bold tracking-widest uppercase text-muted dark:text-[#5a5650] border-b-2 border-transparent transition-all hover:text-ink dark:hover:text-[#e8e4dc] cursor-pointer bg-transparent ${activeTab === id ? activeClass : ''}`}
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
            className={`ml-auto md:ml-4 px-3 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wide border rounded transition-colors flex items-center justify-center ${
              stepsHidden
                ? 'text-accent border-accent/30 hover:bg-accent/10 dark:text-[#a878d8] dark:border-[#a878d8]/30 dark:hover:bg-[#a878d8]/10'
                : 'text-muted border-border/50 hover:text-ink hover:border-border dark:text-[#5a5650] dark:border-[#2a2824] dark:hover:text-[#e8e4dc]'
            }`}
            title={stepsHidden ? 'Show Construction Steps' : 'Hide Construction Steps'}
          >
            {/* 3 horizontal lines icon for < lg screens */}
            <span className="lg:hidden flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="17" x2="20" y2="17"></line>
              </svg>
            </span>
            {/* Text for >= lg screens */}
            <span className="hidden lg:inline-block">
              {stepsHidden ? '+ Steps' : '- Steps'}
            </span>
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