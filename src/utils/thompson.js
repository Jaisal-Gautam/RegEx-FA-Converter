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
  addTrans(n1.accept, n2.start, 'ε', 'bridge') // connect two sub-NFAs
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

export function nfaPlus(n) {
  const a = newState()
  addTrans(n.accept, n.start, 'ε', 'loop') // repeat: go back for next iteration
  addTrans(n.accept, a,       'ε', 'exit') // done repeating: leave the plus
  return makeNFA(n.start, a)
}

export function nfaOptional(n) {
  const a = newState()
  addTrans(n.accept, a,      'ε', 'exit') // matched: exit
  addTrans(n.start,  a,      'ε', 'skip') // skip (zero occurrences)
  return makeNFA(n.start, a)
}

// ── Regex parser ───────────────────────────────────────────────────────────

function tokenize(re) {
  const tokens = []
  for (let i = 0; i < re.length; i++) {
    const c = re[i]
    if (c === '\\' && i + 1 < re.length) {
      tokens.push({ type: 'char', val: re[++i] })
      continue
    }
    const map = { '(': 'lparen', ')': 'rparen', '|': 'union', '*': 'star', '+': 'plus', '?': 'ques' }
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
      const curAtom = ['char', 'rparen', 'star', 'plus', 'ques'].includes(cur.type)
      const nxtAtom = ['char', 'lparen'].includes(nxt.type)
      if (curAtom && nxtAtom) out.push({ type: 'concat', val: '·' })
    }
  }
  return out
}

const PREC = { union: 1, concat: 2, star: 3, plus: 3, ques: 3 }

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
    if (['star', 'plus', 'ques'].includes(t.type)) { out.push(t); continue }
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
      case 'plus':   stack.push(nfaPlus(stack.pop())); break
      case 'ques':   stack.push(nfaOptional(stack.pop())); break
      default: break
    }
  }
  if (stack.length !== 1) throw new Error('Invalid regex expression')
  return stack[0]
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
