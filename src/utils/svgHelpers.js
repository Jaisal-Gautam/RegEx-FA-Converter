/**
 * svgHelpers.js
 * Pure math utilities for drawing curved SVG paths between automaton states.
 */

export const STATE_RADIUS = 26

/**
 * Generate a quadratic-bezier SVG path string from (x1,y1) to (x2,y2).
 * - Self-loops use a cubic arc above the state.
 * - `bend` offsets the control point perpendicular to the line.
 */
export function curvePath(x1, y1, x2, y2, bend = 0) {
  const R = STATE_RADIUS

  // Self-loop
  if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) < 1) {
    return `M ${x1} ${y1 - R} C ${x1 - 50} ${y1 - 90}, ${x1 + 50} ${y1 - 90}, ${x1} ${y1 - R}`
  }

  const dx  = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx  = -dy / len, ny = dx / len
  const cx  = (x1 + x2) / 2 + nx * bend * 60
  const cy  = (y1 + y2) / 2 + ny * bend * 60

  const ang1 = Math.atan2(cy - y1, cx - x1)
  const ang2 = Math.atan2(y2 - cy, x2 - cx)
  const sx   = x1 + Math.cos(ang1) * R
  const sy   = y1 + Math.sin(ang1) * R
  const ex   = x2 - Math.cos(ang2) * R
  const ey   = y2 - Math.sin(ang2) * R

  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`
}

/**
 * @param {number} labelShift  - extra perpendicular pixels to shift label
 * @param {{x:number, y:number}[]} avoidNodes - optional list of points to avoid
 */
export function labelPos(x1, y1, x2, y2, bend = 0, labelShift = 0, avoidNodes = []) {
  if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) < 1) {
    if (bend < 0) {
      return { x: x1 + labelShift, y: y1 + 72 }
    }
    return { x: x1 + labelShift, y: y1 - 72 }
  }
  const dx  = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  let nx = -dy / len, ny = dx / len

  // Directional logic: ensure labels prefer "Top" side (ny < 0) 
  // or "Right" side (nx > 0) for horizontal lines, but only if bend is 0.
  if (Math.abs(bend) < 0.01) {
    if (ny > 0 || (Math.abs(ny) < 0.01 && nx < 0)) {
      nx = -nx
      ny = -ny
    }
  }

  const cx  = (x1 + x2) / 2 + nx * bend * 60
  const cy  = (y1 + y2) / 2 + ny * bend * 60
  
  // Increase base offset for better breathing room
  let offset = 28 + Math.abs(bend) * 12 + Math.abs(labelShift)
  const R = STATE_RADIUS + 15 // Collision radius (states)

  // Improved collision avoidance: push label out if it's too close to any state
  for (let attempt = 0; attempt < 12; attempt++) {
    const lx = cx + nx * (offset + labelShift)
    const ly = cy + ny * (offset + labelShift)
    
    let collision = false
    for (const node of avoidNodes) {
      const distSq = (lx - node.x)**2 + (ly - node.y)**2
      if (distSq < R * R) {
        collision = true
        break
      }
    }
    
    if (!collision) break
    offset += 12 // Bump further out if still colliding
  }

  return {
    x: cx + nx * (offset + labelShift),
    y: cy + ny * (offset + labelShift),
  }
}

/**
 * Compute bend factors so parallel/bidirectional edges fan out and never overlap.
 *
 * Groups transitions by their directed pair (from|to) for parallel edges,
 * and by undirected pair for bidirectional detection.
 * Parallel edges (same from→to) are spread symmetrically with generous spacing.
 *
 * @param {{ from:number, to:number }[]} transitions
 * @returns {number[]}
 */
export function computeBends(transitions) {
  // Group by DIRECTED pair so A→B and B→A are separate groups
  const dirGroups = {}
  transitions.forEach((t, i) => {
    const key = `${t.from}→${t.to}`
    if (!dirGroups[key]) dirGroups[key] = []
    dirGroups[key].push(i)
  })

  // Also detect if a reverse edge exists for any transition
  const hasReverseMap = {}
  transitions.forEach(t => {
    const revKey = `${t.to}→${t.from}`
    if (dirGroups[revKey]?.length > 0) {
      const fwdKey = `${t.from}→${t.to}`
      hasReverseMap[fwdKey] = true
    }
  })

  const bends = new Array(transitions.length).fill(0)

  for (const [key, indices] of Object.entries(dirGroups)) {
    const n          = indices.length
    const hasReverse = !!hasReverseMap[key]

    if (n === 1) {
      // Single edge: only arc away if a reverse exists
      bends[indices[0]] = hasReverse ? 0.5 : 0
      continue
    }

    // Multiple parallel edges: spread symmetrically with generous spacing
    // n=2 → [-0.5, +0.5]
    // n=3 → [-0.7, 0, +0.7]
    // n=4 → [-0.8, -0.3, +0.3, +0.8]
    const maxBend = 0.4 + (n - 1) * 0.2
    indices.forEach((idx, rank) => {
      bends[idx] = n === 1 ? 0 : -maxBend + (rank * 2 * maxBend) / (n - 1)
    })
  }

  return bends
}

// ── Role-aware ε styling ────────────────────────────────────────────────────

/**
 * Visual style config keyed by ε-transition role.
 * Each entry defines stroke colour, dash pattern and a human-readable label.
 */
export const EPS_ROLE_STYLE = {
  entry:    { stroke: '#4a7c59', dash: '6,3',  label: 'entry'  },   // dark green — enter body
  'entry-1':{ stroke: '#4a7c59', dash: '6,3',  label: 'entry 1' },
  'entry-2':{ stroke: '#3a6b7a', dash: '6,3',  label: 'entry 2' },
  skip:     { stroke: '#8c6d3f', dash: '3,4',  label: 'skip'   },   // amber — bypass body
  loop:     { stroke: '#3a5a8c', dash: '8,3',  label: 'loop'   },   // blue  — repeat
  exit:     { stroke: '#7a766e', dash: '4,4',  label: 'exit'   },   // grey  — leave construct
  bridge:   { stroke: '#9a9a8a', dash: '5,3',  label: 'bridge' },   // light grey — concat join
  join:     { stroke: '#7a5a8c', dash: '5,3',  label: 'join'   },   // purple — union merge
  default:  { stroke: '#3a5a8c', dash: '5,3',  label: 'ε'      },
}

/**
 * Get the visual style for a transition.
 * Non-ε transitions return null.
 */
export function getEpsStyle(transition) {
  if (transition.symbol !== 'ε') return null
  const role = transition.role ?? 'default'
  return EPS_ROLE_STYLE[role] ?? EPS_ROLE_STYLE.default
}
