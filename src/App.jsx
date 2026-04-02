import { useState } from 'react'
import Header     from './components/Header'
import LeftPanel  from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import { useAutomaton } from './hooks/useAutomaton'

export default function App() {
  const automaton = useAutomaton('(a|b)*abb')
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`flex flex-col min-h-screen font-sans bg-bg text-ink transition-colors duration-300 ${darkMode ? 'dark bg-[#0f0e0c] text-[#e8e4dc]' : ''}`}>
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      <main className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-[30%_70%] h-[calc(100vh-65px)]">
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
        />
      </main>
    </div>
  )
}