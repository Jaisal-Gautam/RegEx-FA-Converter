/**
 * thompson.js
 * Pure Thompson's construction engine.
 * No React, no side-effects — all functions return plain data.
 */

// ── State factory ──────────────────────────────────────────────────────────
let _counter = 0

export function resetCounter() {
  _counter = 0
}

function newState() {
  return { id: _counter++, transitions: [], isStart: false, isAccept: false }
}

function addTrans(from, to, symbol, role = null) {
  from.transitions.push({ to, symbol, role })
}

function makeNFA(start, accept) {
  return { start, accept }
}

// ── Thompson primitives ────────────────────────────────────────────────────

export function nfaLiteral(c) {
  const s = newState(), a = newState()
  addTrans(s, a, c)
  return makeNFA(s, a)
}

export function nfaUnion(n1, n2) {
  const s = newState(), a = newState()
  addTrans(s, n1.start, 'ε', 'entry-1') // branch into option 1
  addTrans(s, n2.start, 'ε', 'entry-2') // branch into option 2
  addTrans(n1.accept,   a,   'ε', 'join') // merge from option 1
  addTrans(n2.accept,   a,   'ε', 'join') // merge from option 2
  return makeNFA(s, a)
}

export function nfaConcat(n1, n2) {
  // Merge the two machines by re-routing anything pointing to n1.accept directly to n2.start.
  // Because Thompson machines guarantee n1.accept has 0 outgoing transitions, 
  // it is perfectly safe to orphan it and replace its presence with n2.start.
  const visited = new Set()
  const redirect = (s) => {
    if (visited.has(s.id)) return
    visited.add(s.id)
    s.transitions.forEach(t => {
      if (t.to === n1.accept) {
        t.to = n2.start
      }
      redirect(t.to)
    })
  }
  redirect(n1.start)
  
  return makeNFA(n1.start, n2.accept)
}

// Optimised: reuse the inner NFA's own start node so there is no redundant
// wrapper start state producing a double-ε into the same target.
export function nfaStar(n) {
  const a = newState()
  addTrans(n.accept, n.start, 'ε', 'loop') // repeat: go back for next iteration
  addTrans(n.accept, a,       'ε', 'exit') // done repeating: leave the star
  addTrans(n.start,  a,       'ε', 'skip') // zero repetitions: bypass body
  return makeNFA(n.start, a)
}

// nfaPlus and nfaOptional removed as requested

// ── Regex parser ───────────────────────────────────────────────────────────

function tokenize(re) {
  const tokens = []
  for (let i = 0; i < re.length; i++) {
    const c = re[i]
    if (c === '\\' && i + 1 < re.length) {
      tokens.push({ type: 'char', val: re[++i] })
      continue
    }
    const map = { '(': 'lparen', ')': 'rparen', '+': 'union', '*': 'star', '.': 'concat' }
    tokens.push(map[c] ? { type: map[c], val: c } : { type: 'char', val: c })
  }
  return tokens
}

function addConcats(tokens) {
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i])
    if (i + 1 < tokens.length) {
      const cur = tokens[i], nxt = tokens[i + 1]
      const curAtom = ['char', 'rparen', 'star'].includes(cur.type)
      const nxtAtom = ['char', 'lparen'].includes(nxt.type)
      if (curAtom && nxtAtom) out.push({ type: 'concat', val: '.' })
    }
  }
  return out
}

const PREC = { union: 1, concat: 2, star: 3 }

function toPostfix(tokens) {
  const out = [], ops = []
  for (const t of tokens) {
    if (t.type === 'char') { out.push(t); continue }
    if (t.type === 'lparen') { ops.push(t); continue }
    if (t.type === 'rparen') {
      while (ops.length && ops.at(-1).type !== 'lparen') out.push(ops.pop())
      if (!ops.length) throw new Error('Mismatched parentheses')
      ops.pop()
      continue
    }
    if (t.type === 'star') { out.push(t); continue }
    while (ops.length && ops.at(-1).type !== 'lparen' && PREC[ops.at(-1).type] >= PREC[t.type])
      out.push(ops.pop())
    ops.push(t)
  }
  while (ops.length) {
    if (ops.at(-1).type === 'lparen') throw new Error('Mismatched parentheses')
    out.push(ops.pop())
  }
  return out
}

function buildNFAFromPostfix(postfix) {
  const stack = []
  for (const t of postfix) {
    switch (t.type) {
      case 'char':   stack.push(nfaLiteral(t.val)); break
      case 'union':  { const b = stack.pop(), a = stack.pop(); stack.push(nfaUnion(a, b)); break }
      case 'concat': { const b = stack.pop(), a = stack.pop(); stack.push(nfaConcat(a, b)); break }
      case 'star':   stack.push(nfaStar(stack.pop())); break
      default: break
    }
  }
  if (stack.length !== 1) throw new Error('Invalid regex expression')
  return stack[0]
}

// ── Snapshot helper for step-by-step construction ──────────────────────────

/** Take a plain-data snapshot of a sub-NFA (states + transitions). */
function snapshotNFA(nfa) {
  const states = collectStates(nfa.start)
  const transitions = flattenTransitions(states)
  return {
    states: states.map(s => ({
      id: s.id,
      isStart: s.id === nfa.start.id,
      isAccept: s.id === nfa.accept.id,
    })),
    transitions,
    startId: nfa.start.id,
    acceptId: nfa.accept.id,
  }
}

/** Take a plain-data snapshot of ALL sub-NFAs currently disjointly sitting on the stack. */
function snapshotStack(stack) {
  const mergedStates = []
  const mergedTransitions = []
  const startIds = []
  const acceptIds = []

  // Iterate over each independent NFA on the stack
  for (const nfa of stack) {
    const states = collectStates(nfa.start)
    const transitions = flattenTransitions(states)
    
    // Tag the states from this specific nfa sub-component
    states.forEach(s => {
      mergedStates.push({
        id: s.id,
        isStart: s.id === nfa.start.id,
        isAccept: s.id === nfa.accept.id,
      })
    })
    
    mergedTransitions.push(...transitions)
    startIds.push(nfa.start.id)
    acceptIds.push(nfa.accept.id)
  }

  return {
    states: mergedStates,
    transitions: mergedTransitions,
    startIds,
    acceptIds,
  }
}

/**
 * Like buildNFAFromPostfix, but records each construction step with a
 * full sub-NFA snapshot. Returns { nfa, steps }.
 */
function buildNFAFromPostfixWithSteps(postfix) {
  const stack = []      // NFA stack
  const exprStack = []  // parallel expression-label stack
  const steps = []

  for (const t of postfix) {
    let nfa, exprLabel, inputSnapshots = [], inputLabels = [], breaks_here_connections

    switch (t.type) {
      case 'char': {
        nfa = nfaLiteral(t.val)
        exprLabel = t.val
        // connections: one literal edge
        breaks_here_connections = [{ from: nfa.start.id, to: nfa.accept.id, symbol: t.val, role: 'literal' }]
        break
      }
      case 'union': {
        const bNfa = stack.pop(), aNfa = stack.pop()
        const bLabel = exprStack.pop(), aLabel = exprStack.pop()
        const aStart = aNfa.start.id, aAccept = aNfa.accept.id
        const bStart = bNfa.start.id, bAccept = bNfa.accept.id
        exprLabel = `(${aLabel}+${bLabel})`

        const s = newState()
        const a = newState()

        // 1. Create start state and entry edges
        addTrans(s, aNfa.start, 'ε', 'entry-1')
        addTrans(s, bNfa.start, 'ε', 'entry-2')
        
        let currentStack = [...stack, { start: s, accept: aNfa.accept }]
        steps.push({
          index: steps.length,
          type: 'union-step',
          token: t,
          exprLabel: `${exprLabel} (1/2: Branches)`,
          inputSnapshots: [snapshotNFA(aNfa), snapshotNFA(bNfa)],
          inputLabels: [aLabel, bLabel],
          connections: [
            { from: s.id, to: aStart, symbol: 'ε', role: 'entry-1', desc: `new start q${s.id} → NFA(${aLabel}) start q${aStart}` },
            { from: s.id, to: bStart, symbol: 'ε', role: 'entry-2', desc: `new start q${s.id} → NFA(${bLabel}) start q${bStart}` },
          ],
          resultSnapshot: snapshotNFA({ start: s, accept: aNfa.accept }), // fake accept for layout bounding
          stackSnapshot: snapshotStack(currentStack),
          parentType: 'union'
        })

        // 2. Create accept state and join edges
        addTrans(aNfa.accept, a, 'ε', 'join')
        addTrans(bNfa.accept, a, 'ε', 'join')
        
        nfa = { start: s, accept: a }
        
        inputSnapshots = [snapshotNFA(aNfa), snapshotNFA(bNfa)]
        inputLabels = [aLabel, bLabel]
        breaks_here_connections = [
          { from: aAccept, to: a.id, symbol: 'ε', role: 'join-1', desc: `NFA(${aLabel}) accept q${aAccept} → new accept q${a.id}` },
          { from: bAccept, to: a.id, symbol: 'ε', role: 'join-2', desc: `NFA(${bLabel}) accept q${bAccept} → new accept q${a.id}` },
        ]
        break
      }
      case 'concat': {
        const bNfa = stack.pop(), aNfa = stack.pop()
        const bLabel = exprStack.pop(), aLabel = exprStack.pop()
        const aAcceptId = aNfa.accept.id
        const bStartId  = bNfa.start.id
        inputSnapshots = [snapshotNFA(aNfa), snapshotNFA(bNfa)]
        inputLabels = [aLabel, bLabel]
        nfa = nfaConcat(aNfa, bNfa)
        exprLabel = `${aLabel}.${bLabel}`
        breaks_here_connections = [
          { from: aAcceptId, to: bStartId, symbol: 'merge', role: 'bridge', desc: `NFA(${aLabel}) accept q${aAcceptId} merges into NFA(${bLabel}) start q${bStartId} — no new state needed` },
        ]
        break
      }
      case 'star': {
        const inner = stack.pop()
        const innerLabel = exprStack.pop()
        const iStart = inner.start.id, iAccept = inner.accept.id
        exprLabel = innerLabel.length > 1 ? `(${innerLabel})*` : `${innerLabel}*`

        const a = newState()

        // 1. Loop edge
        addTrans(inner.accept, inner.start, 'ε', 'loop')
        const nfaLoop = { start: inner.start, accept: inner.accept }
        let currentStack = [...stack, nfaLoop]
        steps.push({
          index: steps.length,
          type: 'star-step',
          token: t,
          exprLabel: `${exprLabel} (1/3: Loop)`,
          inputSnapshots: [snapshotNFA(inner)],
          inputLabels: [innerLabel],
          connections: [
            { from: iAccept, to: iStart, symbol: 'ε', role: 'loop', desc: `loop: NFA(${innerLabel}) accept q${iAccept} → NFA(${innerLabel}) start q${iStart}` }
          ],
          resultSnapshot: snapshotNFA(nfaLoop),
          stackSnapshot: snapshotStack(currentStack),
          parentType: 'star'
        })

        // 2. Exit edge
        addTrans(inner.accept, a, 'ε', 'exit')
        const nfaExit = { start: inner.start, accept: a }
        currentStack = [...stack, nfaExit]
        steps.push({
          index: steps.length,
          type: 'star-step',
          token: t,
          exprLabel: `${exprLabel} (2/3: Exit)`,
          inputSnapshots: [snapshotNFA(inner)],
          inputLabels: [innerLabel],
          connections: [
            { from: iAccept, to: a.id, symbol: 'ε', role: 'exit', desc: `exit: NFA(${innerLabel}) accept q${iAccept} → new accept q${a.id}` }
          ],
          resultSnapshot: snapshotNFA(nfaExit),
          stackSnapshot: snapshotStack(currentStack),
          parentType: 'star'
        })

        // 3. Skip edge
        addTrans(inner.start, a, 'ε', 'skip')
        nfa = { start: inner.start, accept: a }
        
        inputSnapshots = [snapshotNFA(inner)]
        inputLabels = [innerLabel]
        breaks_here_connections = [
          { from: iStart , to: a.id, symbol: 'ε', role: 'skip', desc: `skip: NFA(${innerLabel}) start q${iStart} → new accept q${a.id} (zero reps)` },
        ]
        break
      }
      default:
        continue
    }

    // eslint-disable-next-line no-use-before-define
    const connections = typeof breaks_here_connections !== 'undefined' ? breaks_here_connections : []
    breaks_here_connections = undefined

    stack.push(nfa)
    exprStack.push(exprLabel)

    steps.push({
      index: steps.length,
      type: t.type,
      token: t,
      exprLabel,
      inputSnapshots,
      inputLabels,
      connections,
      resultSnapshot: snapshotNFA(nfa),
      stackSnapshot: snapshotStack(stack),
    })
  }

  if (stack.length !== 1) throw new Error('Invalid regex expression')
  return { nfa: stack[0], steps }
}

/**
 * Compile a regex string → { nfa, postfix }
 * Throws on parse error.
 */
export function compileRegex(re) {
  if (!re.trim()) throw new Error('Empty expression')
  resetCounter()
  const tokens    = tokenize(re)
  const withConc  = addConcats(tokens)
  const postfix   = toPostfix(withConc)
  const nfa       = buildNFAFromPostfix(postfix)
  nfa.start.isStart   = true
  nfa.accept.isAccept = true
  return { nfa, postfix }
}

/**
 * Compile a regex string → { nfa, postfix, constructionSteps }
 * Like compileRegex, but also records every Thompson construction step
 * with full sub-NFA snapshots for step-by-step visual building.
 */
export function compileRegexWithSteps(re) {
  if (!re.trim()) throw new Error('Empty expression')
  resetCounter()
  const tokens    = tokenize(re)
  const withConc  = addConcats(tokens)
  const postfix   = toPostfix(withConc)
  const { nfa, steps } = buildNFAFromPostfixWithSteps(postfix)
  nfa.start.isStart   = true
  nfa.accept.isAccept = true
  return { nfa, postfix, constructionSteps: steps }
}

// ── State traversal ────────────────────────────────────────────────────────

/** DFS collect all reachable states from `start`. */
export function collectStates(start) {
  const visited = new Set(), states = []
  const dfs = (s) => {
    if (visited.has(s.id)) return
    visited.add(s.id)
    states.push(s)
    s.transitions.forEach(t => dfs(t.to))
  }
  dfs(start)
  return states
}

/** Flatten all transitions into { from, to, symbol, role } objects. */
export function flattenTransitions(states) {
  return states.flatMap(s =>
    s.transitions.map(t => ({ from: s.id, to: t.to.id, symbol: t.symbol, role: t.role ?? null }))
  )
}

/** Extract sorted alphabet (no ε). */
export function extractAlphabet(transitions) {
  return [...new Set(transitions.filter(t => t.symbol !== 'ε').map(t => t.symbol))].sort()
}
