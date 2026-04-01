/**
 * SectionTitle.jsx
 * Left-panel section heading with diamond bullet (CSS pseudo-element via `section-title` class).
 */
export default function SectionTitle({ children }) {
  return (
    <div className="section-title flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.2em] uppercase text-muted mb-2">
      {children}
    </div>
  )
}
