import SectionTitle from './SectionTitle'

/**
 * AutomatonStats.jsx
 * Summary table: state counts, transitions, alphabet, DFA status.
 */
export default function AutomatonStats({ nfaStats, dfaStats }) {
  if (!nfaStats) return null

  const rows = [
    ['States (NFA)',      nfaStats.states],
    ['Transitions (NFA)', nfaStats.trans],
    ['ε-Transitions',    nfaStats.eps],
    ['Alphabet Σ',        nfaStats.alpha],
    ['States (DFA)',      dfaStats?.states ?? '—'],
    ['DFA Complete?',     dfaStats ? '✓ Yes' : '—'],
  ]

  return (
    <div className="px-5 py-3 md:px-6 md:py-4 border-b-0 md:border-b border-border">
      <SectionTitle>Automaton Info</SectionTitle>

      <table className="w-full">
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label}>
              <td className="font-mono text-xs text-muted py-0.5 pr-3 align-top">{label}</td>
              <td className="font-mono text-xs text-accent font-semibold py-0.5 text-right md:text-left align-top">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
