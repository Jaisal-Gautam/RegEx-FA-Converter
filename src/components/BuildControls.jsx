import SectionTitle from './SectionTitle'

/**
 * BuildControls.jsx
 * Primary "Build NFA" button + secondary "Convert to DFA" button.
 */
export default function BuildControls({ onBuildNFA, onBuildDFA, canBuildDFA }) {
  return (
    <div className="px-5 py-3 md:px-6 md:py-4 border-b-0 md:border-b border-border">
      <SectionTitle>Construction</SectionTitle>

      <button
        onClick={onBuildNFA}
        className="flex items-center justify-center gap-1.5 w-full py-2 bg-accent text-white font-sans text-xs font-bold tracking-wide uppercase rounded transition-all hover:-translate-y-px hover:bg-[#215c42] hover:shadow-md active:translate-y-0 active:shadow-none"
      >
        ⚡ Build ε-NFA
      </button>

      <button
        onClick={onBuildDFA}
        disabled={!canBuildDFA}
        className="flex items-center justify-center gap-1.5 w-full mt-1.5 py-1.5 bg-transparent text-accent2 border border-accent2 font-sans text-[0.7rem] font-semibold tracking-wide uppercase rounded transition-all hover:bg-accent2/8 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Convert to DFA (Subset Construction)
      </button>
    </div>
  );
}
