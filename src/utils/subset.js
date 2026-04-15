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
  const dfaSteps  = []
  const queue     = [startClosure]
  const visited   = new Map()
  const key       = ids => ids.join(',')

  visited.set(key(startClosure), 0)
  dfaStates.push({
    id:        0,
    label:     'D0',
    nfaStates: startClosure,
    isAccept:  startClosure.some(id => acceptIds.has(id)),
    isStart:   true,
    isDead:    false,
  })

  dfaSteps.push({
    type: 'dfa-start',
    exprLabel: 'D0 = ε-closure(q0)',
    closureIds: startClosure,
    newDfaStateId: 0,
    resultSnapshot: { states: dfaStates.map(s => ({...s, nfaStates: [...s.nfaStates]})), transitions: [...dfaTrans] }
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
      let isNewState = false

      if (!visited.has(k)) {
        isNewState = true
        targetId = dfaStates.length
        visited.set(k, targetId)
        dfaStates.push({
          id:        targetId,
          label:     `D${targetId}`,
          nfaStates: closure,
          isAccept:  closure.some(id => acceptIds.has(id)),
          isStart:   false,
          isDead:    false,
        })
        queue.push(closure)
      } else {
        targetId = visited.get(k)
      }

      dfaTrans.push({ from: currentId, to: targetId, symbol: sym })

      dfaSteps.push({
        type: 'dfa-move',
        exprLabel: `D${currentId} —${sym}→ D${targetId}`,
        fromDfaState: currentId,
        targetDfaState: targetId,
        symbol: sym,
        movedIds: moved,
        closureIds: closure,
        isNewState,
        resultSnapshot: { states: dfaStates.map(s => ({...s, nfaStates: [...s.nfaStates]})), transitions: [...dfaTrans] }
      })
    }
  }

  // ── Add dead (trap/sink) state if any transitions are missing ───────────
  // A complete DFA requires every state to have exactly one transition per
  // alphabet symbol.  If any (state, symbol) pair lacks a transition, we
  // create a single non-accepting "dead state" and route all missing
  // transitions there (including self-loops on the dead state itself).

  const transSet = new Set(dfaTrans.map(t => `${t.from},${t.symbol}`))
  let needsDead = false
  for (const s of dfaStates) {
    for (const sym of alphabet) {
      if (!transSet.has(`${s.id},${sym}`)) {
        needsDead = true
        break
      }
    }
    if (needsDead) break
  }

  if (needsDead) {
    const deadId = dfaStates.length
    dfaStates.push({
      id:        deadId,
      label:     `D${deadId}`,
      nfaStates: [],          // corresponds to the empty set ∅
      isAccept:  false,
      isStart:   false,
      isDead:    true,
    })

    // Route missing transitions to the dead state
    for (const s of dfaStates) {
      for (const sym of alphabet) {
        if (!transSet.has(`${s.id},${sym}`)) {
          dfaTrans.push({ from: s.id, to: deadId, symbol: sym })
        }
      }
    }

    dfaSteps.push({
      type: 'dfa-trap',
      exprLabel: `Add Trap State`,
      newDfaStateId: deadId,
      resultSnapshot: { states: dfaStates.map(s => ({...s, nfaStates: [...s.nfaStates]})), transitions: [...dfaTrans] }
    })
  }

  return { dfaStates, dfaTrans, dfaSteps }
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
