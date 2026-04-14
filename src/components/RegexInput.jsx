import SectionTitle from './SectionTitle'

const EXAMPLES = ['(a+b)*.a.b.b', 'a*.b*', '(a.b)*', 'a+(b.c)*', '(0+1)*.0.1', 'a.a*+b.b*']

/** Renders a string with every '*' shown as a small superscript. */
function SuperStar({ text, className = '' }) {
  const parts = text.split('*')
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <sup style={{ fontSize: '0.7em', lineHeight: 0, verticalAlign: 'super' }}>*</sup>
          )}
        </span>
      ))}
    </span>
  )
}

/**
 * RegexInput.jsx
 * Regex text field, syntax hint, quick-example pills.
 */
export default function RegexInput({ value, onChange, onBuild, error }) {
  return (
    <div className="p-4 md:p-6 border-b border-border dark:border-[#2a2824]">
      <div className="relative">
        {/* Fake formatted visual layer */}
        <div
          className="absolute inset-0 pointer-events-none px-4 py-4 font-mono text-2xl font-semibold whitespace-pre flex overflow-hidden border border-transparent"
          aria-hidden="true"
        >
          {value ? value.split('').map((char, i) => (
            char === '*'
              ? <span key={i} style={{ display: 'inline-block', width: '1ch', transform: 'translateY(-0.4em) scale(0.7)', transformOrigin: 'bottom' }} className="text-accent text-center">*</span>
              : <span key={i} className="text-ink dark:text-[#e8e4dc]">{char}</span>
          )) : (
            <span className="text-[#88857d] dark:text-[#4a4840]">
              e.g. (a+b)<span style={{ display: 'inline-block', width: '1ch', transform: 'translateY(-0.4em) scale(0.7)', transformOrigin: 'bottom' }} className="text-[#88857d] dark:text-[#4a4840] text-center">*</span>.a.b.b
            </span>
          )}
        </div>
        {/* Actual input handles typing/cursor seamlessly while text is transparent */}
        <input
          className={`regex-input w-full bg-[#f0ede8] dark:bg-[#1a1916] border border-[#e2dfda] dark:border-[#2a2824] text-transparent caret-ink dark:caret-[#e8e4dc] font-mono text-2xl font-semibold px-4 py-4 rounded-md transition-all outline-none focus:border-opacity-50 dark:focus:border-opacity-50 ${error ? 'has-error !border-danger' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onBuild()}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="font-mono text-xs text-danger mt-2">✗ {error}</p>
      )}

      {/* Syntax guide */}
      <ul className="grid mt-4 grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-[#88857d] dark:text-muted">
        {[
          ['a+b', 'union'],
          ['a.b', 'concat'],
          ['a*', 'star'],
          ['()', 'group'],
        ].map(([op, desc]) => (
          <li key={op} className="flex items-center gap-2">
            <code className="text-accent">
              <SuperStar text={op} />
            </code>
            <span className="opacity-70">{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
