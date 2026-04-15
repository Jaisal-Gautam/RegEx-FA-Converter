/**
 * Header.jsx
 * Sticky top bar: RE→FA logo on the left, dark-mode toggle on the right.
 */
export default function Header({ darkMode, onToggleDark, onOpenLearn }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface dark:bg-[#16140f] border-b border-border dark:border-[#2a2824] sticky top-0 z-50 shadow-sm transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight font-sans dark:text-[#e8e4dc]">
          RE<span className="text-accent">→</span>FA
        </span>
        <span className="font-mono text-[0.6rem] text-muted dark:text-[#5a5650] tracking-[0.12em] uppercase whitespace-nowrap hidden sm:inline">
          Regex to Finite Automata Construction
        </span>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-4">
        {/* Learn button */}
        <button
          onClick={onOpenLearn}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all duration-300 rounded-lg border border-border dark:border-[#2a2824] bg-surface2 dark:bg-[#1e1c18] hover:border-accent dark:hover:border-accent hover:text-accent dark:text-[#e8e4dc]"
        >
          <span className="text-sm">🎓</span>
          Learn
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative w-12 h-6 rounded-full border border-border dark:border-[#2a2824] bg-surface2 dark:bg-[#1e1c18] transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span
            className="absolute inset-0 rounded-full transition-colors duration-300"
            style={{ background: darkMode ? '#2d6a4f22' : 'transparent' }}
          />
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center text-[0.6rem]"
            style={{
              left: darkMode ? '1.375rem' : '0.125rem',
              background: darkMode ? '#2d6a4f' : '#d8d4ce',
            }}
          >
            {darkMode ? '🌙' : '☀️'}
          </span>
        </button>
      </div>
    </header>
  )
}
