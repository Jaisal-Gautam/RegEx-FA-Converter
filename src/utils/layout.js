/**
 * layout.js
 * BFS-layered graph layout for NFA and DFA visualisation.
 * Returns a { [stateId]: { x, y } } position map.
 */

const DEFAULT_W = 160
const DEFAULT_H = 130
const DEFAULT_PAD_X = 80
const DEFAULT_PAD_Y = 60

/**
 * Generic BFS layered layout.
 *
 * @param {(id: number) => number[]} adjFn  - adjacency list for a node id
 * @param {number[]} nodeIds                - all node ids
 * @param {number}   startId               - root node
 * @param {number}   W                     - horizontal spacing
 * @param {number}   H                     - vertical spacing
 * @param {number}   padX                  - left padding
 * @param {number}   padY                  - top-centre padding
 * @returns {Record<number, {x:number, y:number}>}
 */
function bfsLayout(adjFn, nodeIds, startId, W, H, padX, padY) {
  const visited = new Set()
  const layers  = []
  const queue   = [[startId]]
  visited.add(startId)

  while (queue.length) {
    const layer = queue.shift()
    layers.push(layer)
    const next = []
    layer.forEach(id =>
      adjFn(id).forEach(nid => {
        if (!visited.has(nid)) {
          visited.add(nid)
          next.push(nid)
        }
      })
    )
    if (next.length) queue.push(next)
  }

  // Append any unvisited nodes to the last layer
  for (const id of nodeIds) {
    if (!visited.has(id)) {
      layers.at(-1)?.push(id) ?? layers.push([id])
    }
  }

  const pos = {}
  layers.forEach((layer, li) => {
    layer.forEach((id, i) => {
      pos[id] = {
        x: padX + li * W,
        y: padY + (i - (layer.length - 1) / 2) * H,
      }
    })
  })

  return pos
}

/**
 * Layout NFA states using BFS from the start state.
 *
 * @param {object[]} states  - array of NFA state objects
 * @param {number}   startId
 */
export function layoutNFA(states, startId) {
  const adj = Object.fromEntries(states.map(s => [s.id, s.transitions.map(t => t.to.id)]))
  return bfsLayout(
    id => adj[id] ?? [],
    states.map(s => s.id),
    startId,
    DEFAULT_W,
    DEFAULT_H,
    DEFAULT_PAD_X,
    DEFAULT_PAD_Y,
  )
}

/**
 * Layout DFA states using BFS from state 0 (always the start).
 *
 * @param {{ id:number }[]} dfaStates
 * @param {{ from:number, to:number }[]} dfaTrans
 */
export function layoutDFA(dfaStates, dfaTrans) {
  const adj = Object.fromEntries(dfaStates.map(s => [s.id, []]))
  dfaTrans.forEach(t => {
    if (!adj[t.from].includes(t.to)) adj[t.from].push(t.to)
  })
  return bfsLayout(
    id => adj[id] ?? [],
    dfaStates.map(s => s.id),
    0,
    180,
    140,
    80,
    70,
  )
}

/**
 * Compute viewBox string from a position map with padding.
 */
export function computeViewBox(pos, pad = 80) {
  const xs = Object.values(pos).map(p => p.x)
  const ys = Object.values(pos).map(p => p.y)
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w    = Math.max(...xs) - Math.min(...xs) + pad * 2
  const h    = Math.max(...ys) - Math.min(...ys) + pad * 2
  return `${minX} ${minY} ${w} ${h}`
}
