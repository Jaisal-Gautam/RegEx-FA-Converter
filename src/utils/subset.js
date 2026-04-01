/**
 * subset.js
 * Subset (powerset) construction: ε-NFA → DFA.
 * Also provides DFA simulation.
 */

// ── ε-closure ─────────────────────────────────────────────────────────────

export function epsilonClosure(statesArr) {
  const closure = new Set(statesArr.map(s => s.id))
  const stack = [...statesArr]
  while (stack.length) {
    const s = stack.pop()
    s.transitions
      .filter(t => t.symbol === 'ε')
      .forEach(t => {
        if (!closure.has(t.to.id)) {
          closure.add(t.to.id)
          stack.push(t.to)
        }
      })
  }
  return [...closure].sort((a, b) => a - b)
}

// ── Move ──────────────────────────────────────────────────────────────────

export function move(stateIds, symbol, stateMap) {
  const result = new Set()
  stateIds.forEach(id =>
    stateMap[id]?.transitions
      .filter(t => t.symbol === symbol)
      .forEach(t => result.add(t.to.id))
  )
  return [...result]
}

// ── Subset construction ───────────────────────────────────────────────────

/**
 * @param {object}   nfaStart     - NFA start state
 * @param {object[]} allNFAStates - all reachable NFA states
 * @param {string[]} alphabet     - input symbols (no ε)
 * @returns {{ dfaStates, dfaTrans }}
 */
export function subsetConstruction(nfaStart, allNFAStates, alphabet) {
  const stateMap = Object.fromEntries(allNFAStates.map(s => [s.id, s]))
  const acceptIds = new Set(allNFAStates.filter(s => s.isAccept).map(s => s.id))

  const startClosure = epsilonClosure([nfaStart])
  const dfaStates = []
  const dfaTrans  = []
  const queue     = [startClosure]
  const visited   = new Map()
  const key       = ids => ids.join(',')

  visited.set(key(startClosure), 0)
  dfaStates.push({
    id:        0,
    nfaStates: startClosure,
    isAccept:  startClosure.some(id => acceptIds.has(id)),
    isStart:   true,
  })

  while (queue.length) {
    const current   = queue.shift()
    const currentId = visited.get(key(current))

    for (const sym of alphabet) {
      const moved   = move(current, sym, stateMap)
      if (!moved.length) continue

      const closure = epsilonClosure(moved.map(id => stateMap[id]))
      const k       = key(closure)
      let targetId

      if (!visited.has(k)) {
        targetId = dfaStates.length
        visited.set(k, targetId)
        dfaStates.push({
          id:        targetId,
          nfaStates: closure,
          isAccept:  closure.some(id => acceptIds.has(id)),
          isStart:   false,
        })
        queue.push(closure)
      } else {
        targetId = visited.get(k)
      }

      dfaTrans.push({ from: currentId, to: targetId, symbol: sym })
    }
  }

  return { dfaStates, dfaTrans }
}

// ── DFA simulation ─────────────────────────────────────────────────────────

/**
 * Run `input` string on DFA. Returns { accepted, path }.
 * `path` is the sequence of DFA state IDs visited.
 */
export function simulateDFA(dfaStates, dfaTrans, input) {
  let current = 0
  const path = [0]

  for (const ch of input) {
    const t = dfaTrans.find(t => t.from === current && t.symbol === ch)
    if (!t) return { accepted: false, path }
    current = t.to
    path.push(current)
  }

  return {
    accepted: dfaStates.find(s => s.id === current)?.isAccept ?? false,
    path,
  }
}

/**
 * Simulate `input` on the NFA directly using ε-closure tracking.
 * Useful before DFA conversion.
 */
export function simulateNFA(nfaStart, allStates, input) {
  const stateMap = Object.fromEntries(allStates.map(s => [s.id, s]))
  const acceptId = allStates.find(s => s.isAccept)?.id

  let current = epsilonClosure([nfaStart])

  for (const ch of input) {
    const moved = move(current, ch, stateMap)
    if (!moved.length) return { accepted: false }
    current = epsilonClosure(moved.map(id => stateMap[id]))
  }

  return { accepted: current.includes(acceptId) }
}
