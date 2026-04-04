# RE→FA · RegEx to Finite Automaton

An interactive, responsive, and highly-polished visualization tool that converts regular expressions into an ε-NFA via **Thompson's Construction**, and optionally converts it to a purely deterministic **DFA** via **Subset Construction**. 

## Features

- **Algorithmic Step-Through Animations**: Watch the compiler parse regular expressions piece by piece. Visually step through each step of Thompson's construction and Subset construction.
- **Topological Layout Generation**: Beautiful layer-based deterministic placement of graphical vectors ensuring deterministic visual flow paths.
- **Interactive SVG Engine**: Highly responsive, fully scaled graphing engine employing `react-zoom-pan-pinch` for dynamic drag-panning, edge boundary locking, and scrollwheel focal zooms.
- **Vector Blueprint Export**: Export any dynamically-constructed graphical NFA or DFA blueprint as a named `.svg` right into your file system. 
- **Dark Mode**: Fully supports an aesthetic, glass-morphic dark mode toggle that flawlessly adjusts transition halos, syntax-highlight colors, and UI layout contrasts using Tailwind.
- **State Simulator**: Run raw string evaluations against your created Non-Deterministic and Deterministic engines. Look directly at the generated layout to see highlighted execution paths.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Project Structure

```text
regex-automaton/
├── index.html                   # Vite HTML entry point
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                 # React DOM pipeline root
    ├── App.jsx                  # Root component (grid layout + core states)
    │
    ├── styles/
    │   └── index.css            # Core Tailwind layout logic + thematic CSS globals
    │
    ├── hooks/
    │   └── useAutomaton.js      # Primary state hook handling compiler dispatch and step timing
    │
    ├── utils/
    │   ├── thompson.js          # Regex AST parsing + Thompson's construction logic 
    │   ├── subset.js            # DFA derivation sets, closures, simulation testing
    │   ├── layout.js            # BFS hierarchical graph placement coordinates
    │   └── svgHelpers.js        # Curved transition paths, intersecting edge solvers
    │
    └── components/
        ├── Header.jsx           # Global sticky nav + dark mode toggle
        ├── LeftPanel.jsx        # Data manipulation structural sidebar 
        ├── RightPanel.jsx       # Tab navigator and grid switcher 
        ├── ConstructionSteps.jsx# Step-by-step UI history derivation timeline logs
        ├── RegexInput.jsx       # Regex evaluation input fields & visual guides
        ├── AutomatonSVG.jsx     # Pure declarative SVG layout renderer
        ├── CanvasPanel.jsx      # Zoomable transform wrapper and download exporter
        └── TransitionTable.jsx  # Raw mathematical layout state tables
```

## Internal Architecture

**Data Flow**: The application relies deeply on standard React unidirectional functional flows. The `useAutomaton` controller hook maintains graph states, tokenizing vectors, and algorithm progress, filtering them directly downwards into cleanly separated presentational interfaces (`LeftPanel`, `CanvasPanel`, `TransitionTable`).

**Deterministic Vectors**: Graphs are parsed on the fly mathematically and mapped onto SVG elements. We inject precision SVG namespaces onto raw cloned elements in memory to power isolated exports without dependency bloat.

**Design Logic**: Layout positioning exclusively utilizes modern `grid` block components configured by `Tailwind CSS`, ensuring robust responsiveness horizontally bounded completely by overflow locking. No draggable panels or misaligned flex margins disrupt the canvas mapping.
