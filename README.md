# RE→FA · RegEx to Finite Automaton

Interactive tool that converts a regular expression into an ε-NFA via **Thompson's Construction**, then optionally converts it to a **DFA** via subset construction.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
regex-automaton/
├── index.html                   # Vite HTML entry point
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                 # React DOM root
    ├── App.jsx                  # Root component (layout wiring only)
    │
    ├── styles/
    │   └── index.css            # Tailwind directives + custom component classes
    │
    ├── hooks/
    │   ├── useAutomaton.js      # All build/convert/simulate state logic
    │   └── usePanZoom.js        # SVG pan + scroll-wheel zoom
    │
    ├── utils/
    │   ├── thompson.js          # Regex parser + Thompson's NFA construction
    │   ├── subset.js            # ε-closure, subset construction, DFA simulation
    │   ├── layout.js            # BFS layered graph layout + viewBox computation
    │   └── svgHelpers.js        # Quadratic bezier paths, label positions, edge bends
    │
    └── components/
        ├── Header.jsx           # Sticky top bar with logo + tech badges
        ├── LeftPanel.jsx        # Sidebar assembler
        ├── RightPanel.jsx       # Tab bar + panel switcher
        ├── SectionTitle.jsx     # Reusable section heading with diamond bullet
        ├── RegexInput.jsx       # Regex field + syntax hint + example pills
        ├── BuildControls.jsx    # Build NFA + Convert to DFA buttons
        ├── PostfixDisplay.jsx   # Colour-coded postfix token strip
        ├── AutomatonStats.jsx   # State/transition count summary table
        ├── SimulatePanel.jsx    # String input + accepted/rejected badge
        ├── AutomatonSVG.jsx     # Pure declarative SVG renderer
        ├── CanvasPanel.jsx      # SVG canvas with zoom controls + legend
        └── TransitionTable.jsx  # NFA / DFA transition function table
```

## Architecture

**Data flow:** `useAutomaton` hook owns all state → passes down as props → components are purely presentational.

**Utils are pure functions** — no React imports, easy to unit test.

**Tailwind** handles all layout and spacing. Custom CSS classes in `index.css` cover things Tailwind can't express: pseudo-elements (`::before` diamond bullets), dynamic focus rings tied to CSS custom properties, SVG keyframe animations, and token colour variants.
