import SectionTitle from './SectionTitle'

const EXAMPLES = ['(a|b)*abb', 'a*b*', '(ab)+', 'a?(b|c)*', '(0|1)*01', 'aa*|bb*']

/**
 * RegexInput.jsx
 * Regex text field, syntax hint, quick-example pills.
 */
export default function RegexInput({ value, onChange, onBuild, error }) {
  return (
    <div className="px-5 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-border dark:border-[#2a2824]">
      <SectionTitle>Regular Expression</SectionTitle>

      <input
        className={`regex-input w-full bg-surface2 dark:bg-[#1a1916] border border-border dark:border-[#2a2824] text-ink dark:text-[#e8e4dc] placeholder:text-muted dark:placeholder:text-[#3a3830] font-mono text-xl font-semibold px-4 py-2.5 rounded transition-all ${error ? 'has-error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onBuild()}
        spellCheck={false}
        autoComplete="off"
        placeholder="e.g. (a|b)*abb"
      />

      {error && (
        <p className="font-mono text-xs text-danger mt-2">✗ {error}</p>
      )}

      {/* Syntax guide — hidden on mobile, shown on tablet/desktop */}
      <ul className="hidden md:grid mt-2 grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[0.7rem] text-muted">
        {[
          ['a|b', 'union'],
          ['ab',  'concat'],
          ['a*',  'star'],
          ['a+',  'plus'],
          ['a?',  'optional'],
          ['()',  'group'],
        ].map(([op, desc]) => (
          <li key={op} className="flex items-center gap-1.5">
            <code className="text-accent">{op}</code>
            <span className="opacity-60">{desc}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-1 mt-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className="bg-surface2 dark:bg-[#1a1916] border border-border dark:border-[#2a2824] text-muted dark:text-[#5a5650] font-mono text-xs px-2.5 py-1 rounded-sm cursor-pointer hover:border-accent hover:text-accent hover:bg-accent/5 transition-all"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
