import { useState } from 'react'
import Header     from './components/Header'
import LeftPanel  from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import { useAutomaton } from './hooks/useAutomaton'
import ConstructionSteps from './components/ConstructionSteps'

export default function App() {
  const automaton = useAutomaton('')
  const [darkMode, setDarkMode] = useState(false)
  const [stepsHidden, setStepsHidden] = useState(false)

  const hasSteps = (automaton.activeTab !== 'table') && (
    (automaton.activeTab === 'nfa' && automaton.postfix?.length > 0) ||
    (automaton.activeTab === 'dfa' && automaton.dfaRaw?.dfaStates?.length > 0)
  )
  
  const showSteps = hasSteps && !stepsHidden

  return (
    <div className={`flex flex-col min-h-screen md:h-screen md:overflow-hidden w-full font-sans bg-bg text-ink transition-colors duration-300 ${darkMode ? 'dark bg-[#0f0e0c] text-[#e8e4dc]' : ''}`}>
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      <main className={`flex-1 overflow-y-auto md:overflow-hidden min-h-0 flex flex-col md:grid ${showSteps ? 'md:grid-cols-[25%_1fr_230px] lg:grid-cols-[25%_1fr_280px]' : 'md:grid-cols-[28%_1fr]'}`}>
        <LeftPanel
          regexVal={automaton.regexVal}
          onRegexChange={automaton.setRegexVal}
          error={automaton.error}
          onBuildNFA={automaton.buildNFA}
          onBuildDFA={automaton.buildDFA}
          canBuildDFA={automaton.hasNFA}
          postfix={automaton.postfix}
          nfaStats={automaton.nfaStats}
          dfaStats={automaton.dfaStats}
          simInput={automaton.simInput}
          onSimInputChange={automaton.setSimInput}
          onSimRun={automaton.runSimulate}
          simResult={automaton.simResult}
          hasNFA={automaton.hasNFA}
          darkMode={darkMode}
        />

        <RightPanel
          regexVal={automaton.regexVal}
          activeTab={automaton.activeTab}
          onTabChange={automaton.setActiveTab}
          nfaSvgData={automaton.nfaSvgData}
          dfaSvgData={automaton.dfaSvgData}
          dfaHighlight={automaton.dfaHighlight}
          nfaTableData={automaton.nfaTableData}
          dfaRaw={automaton.dfaRaw}
          liveNfaTableData={automaton.liveNfaTableData}
          liveDfaTableData={automaton.liveDfaTableData}
          alphabet={automaton.alphabet}
          isAnimating={automaton.isAnimating}
          animIsDFA={automaton.animIsDFA}
          animStep={automaton.animStep}
          totalAnimSteps={automaton.totalAnimSteps}
          darkMode={darkMode}
          postfix={automaton.postfix}
          nfaLabelMap={automaton.nfaLabelMap}
          hasSteps={hasSteps}
          stepsHidden={stepsHidden}
          onToggleSteps={() => setStepsHidden(!stepsHidden)}
        />

        {showSteps && (
          <ConstructionSteps
            postfix={automaton.postfix}
            dfaRaw={automaton.dfaRaw}
            alphabet={automaton.alphabet}
            isAnimating={automaton.isAnimating}
            animStep={automaton.animStep}
            totalAnimSteps={automaton.totalAnimSteps}
            isDFA={automaton.activeTab === 'dfa'}
            darkMode={darkMode}
            nfaLabelMap={automaton.nfaLabelMap}
            goToStep={automaton.goToStep}
            onClose={() => setStepsHidden(true)}
          />
        )}
      </main>
    </div>
  )
}