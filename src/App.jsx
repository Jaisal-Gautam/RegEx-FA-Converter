import { useState } from 'react'
import Header     from './components/Header'
import LeftPanel  from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import { useAutomaton } from './hooks/useAutomaton'
import StepBuilderSidebar from './components/StepBuilderSidebar'
import LearnModal from './components/LearnModal'

export default function App() {
  const automaton = useAutomaton('')
  const [darkMode, setDarkMode] = useState(false)
  const [stepsHidden, setStepsHidden] = useState(false)
  const [learnOpen, setLearnOpen] = useState(false)

  // When there are construction steps, show the sidebar
  const hasSteps = 
    (automaton.activeTab === 'nfa' && automaton.constructionSteps?.length > 0) ||
    (automaton.activeTab === 'dfa' && automaton.dfaConstructionSteps?.length > 0)
  
  const showSteps = hasSteps && !stepsHidden

  return (
    <div className={`flex flex-col min-h-screen md:h-screen md:overflow-hidden w-full font-sans bg-bg text-ink transition-colors duration-300 ${darkMode ? 'dark bg-[#0f0e0c] text-[#e8e4dc]' : ''}`}>
      <Header 
        darkMode={darkMode} 
        onToggleDark={() => setDarkMode(d => !d)} 
        onOpenLearn={() => setLearnOpen(true)}
      />

      {learnOpen && (
        <LearnModal 
          darkMode={darkMode} 
          onClose={() => setLearnOpen(false)} 
        />
      )}

      <main className={`flex-1 overflow-y-auto md:overflow-hidden min-h-0 flex flex-col md:grid ${showSteps ? 'md:grid-cols-[25%_1fr_320px] lg:grid-cols-[25%_1fr_350px]' : 'md:grid-cols-[28%_1fr]'}`}>
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
          constructionSteps={automaton.activeTab === 'nfa' ? automaton.constructionSteps : automaton.dfaConstructionSteps}
          builderStep={automaton.activeTab === 'nfa' ? automaton.builderStep : automaton.dfaBuilderStep}
          setBuilderStep={automaton.activeTab === 'nfa' ? automaton.setBuilderStep : automaton.setDfaBuilderStep}
        />

        {showSteps && (
          <StepBuilderSidebar
            constructionSteps={automaton.activeTab === 'nfa' ? automaton.constructionSteps : automaton.dfaConstructionSteps}
            builderStep={automaton.activeTab === 'nfa' ? automaton.builderStep : automaton.dfaBuilderStep}
            setBuilderStep={automaton.activeTab === 'nfa' ? automaton.setBuilderStep : automaton.setDfaBuilderStep}
            darkMode={darkMode}
            onClose={() => setStepsHidden(true)}
            isDFA={automaton.activeTab === 'dfa'}
            animInterval={automaton.animInterval}
            setAnimInterval={automaton.setAnimInterval}
          />
        )}


      </main>
    </div>
  )
}