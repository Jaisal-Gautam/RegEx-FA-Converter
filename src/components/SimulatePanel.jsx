import SectionTitle from './SectionTitle'

/**
 * SimulatePanel.jsx
 * String input + Run button + accepted/rejected badge.
 */
export default function SimulatePanel({ value, onChange, onRun, result, disabled }) {
  return (
    <div className="px-5 py-3 md:px-6 md:py-4 border-b border-border dark:border-[#2a2824]">
      <SectionTitle>Simulate Input</SectionTitle>

      <div className="flex flex-col gap-2">
        <input
          className="sim-input w-full bg-surface2 dark:bg-[#1a1916] border border-border dark:border-[#2a2824] text-ink dark:text-[#e8e4dc] placeholder:text-muted dark:placeholder:text-[#3a3830] font-mono text-sm px-3 py-2 rounded transition-colors"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !disabled && onRun()}
          placeholder="Enter string…"
          autoComplete="off"
          disabled={disabled}
        />
        <button
          onClick={onRun}
          disabled={disabled}
          className="w-full px-4 py-2 bg-accent3 text-white font-sans text-xs font-bold rounded transition-all hover:bg-[#744d18] disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
        >
          Run
        </button>
      </div>

      {result && (
        <div className={`inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-sm font-mono text-sm font-semibold border ${
          result.accepted
            ? 'bg-accent/10 border-accent text-accent'
            : 'bg-danger/8 border-danger text-danger'
        }`}>
          {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'} — &ldquo;{result.text}&rdquo;
        </div>
      )}
    </div>
  )
}
