import SectionTitle from './SectionTitle'

const TOKEN_CLS = {
  char:   'token-char',
  concat: 'token-concat',
  union:  'token-union',
  star:   'token-star',
  plus:   'token-plus',
  ques:   'token-ques',
}

/**
 * PostfixDisplay.jsx
 * Colour-coded postfix token strip + step count.
 */
export default function PostfixDisplay({ postfix }) {
  if (!postfix.length) return null

  return (
    <div className="p-6 border-b border-border">
      <SectionTitle>Parsed Postfix</SectionTitle>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {postfix.map((t, i) => (
          <span
            key={i}
            className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-sm border ${TOKEN_CLS[t.type] ?? 'token-concat'}`}
          >
            {t.val}
          </span>
        ))}
      </div>

      <p className="font-mono text-[0.7rem] text-muted mt-2">
        {postfix.length} postfix tokens
      </p>
    </div>
  )
}
