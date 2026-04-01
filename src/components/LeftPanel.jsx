import RegexInput     from './RegexInput'
import BuildControls  from './BuildControls'
import AutomatonStats from './AutomatonStats'
import SimulatePanel  from './SimulatePanel'

export default function LeftPanel({
  regexVal, onRegexChange, error,
  onBuildNFA, onBuildDFA, canBuildDFA,
  postfix,
  nfaStats, dfaStats,
  simInput, onSimInputChange, onSimRun, simResult,
  hasNFA,
}) {
  return (
    <aside className="bg-surface dark:bg-[#16140f] overflow-hidden border-b md:border-b-0 md:border-r border-border dark:border-[#2a2824] md:h-full">
      <div className="grid grid-cols-2 md:flex md:flex-col md:h-full overflow-hidden">

        {/* Row 1 – Regex input (full width) */}
        <div className="col-span-2 md:col-auto">
          <RegexInput
            value={regexVal}
            onChange={onRegexChange}
            onBuild={onBuildNFA}
            error={error}
          />
        </div>

        {/* Row 2 col 1 – Build buttons (border-r only; bottom border handled by separator) */}
        <div className="border-r md:border-r-0 border-border dark:border-[#2a2824] flex flex-col justify-center">
          <BuildControls
            onBuildNFA={onBuildNFA}
            onBuildDFA={onBuildDFA}
            canBuildDFA={canBuildDFA}
          />
        </div>

        {/* Row 2 col 2 – Stats */}
        <div>
          <AutomatonStats nfaStats={nfaStats} dfaStats={dfaStats} />
        </div>

        {/*
          Row 2 bottom separator (mobile only).
          h-0 means it takes no space but its border-b draws a single line
          exactly at the bottom of the grid row — same point for both columns.
        */}
        <div className="col-span-2 md:hidden border-b border-border dark:border-[#2a2824]" />

        {/* Row 3 – Simulate (full width, conditional) */}
        {hasNFA && (
          <div className="col-span-2 md:col-auto">
            <SimulatePanel
              value={simInput}
              onChange={onSimInputChange}
              onRun={onSimRun}
              result={simResult}
              disabled={!hasNFA}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
