import type { Rect } from './types'

export interface Pt {
  x: number
  y: number
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function contains(r: Rect, p: Pt): boolean {
  return (
    p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]
  )
}

function clampToRect(r: Rect, p: Pt): Pt {
  return {
    x: clamp(p.x, r[0], r[0] + r[2]),
    y: clamp(p.y, r[1], r[1] + r[3]),
  }
}

// Punto camminabile più vicino a p tra tutti i walkbox.
export function nearestWalkable(boxes: Rect[], p: Pt): Pt {
  let best = p
  let bestD = Infinity
  for (const r of boxes) {
    const q = clampToRect(r, p)
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = q
    }
  }
  return best
}

// Due box sono adiacenti se, espansi di 1px, si sovrappongono.
function adjacent(a: Rect, b: Rect): boolean {
  return (
    a[0] <= b[0] + b[2] + 1 &&
    b[0] <= a[0] + a[2] + 1 &&
    a[1] <= b[1] + b[3] + 1 &&
    b[1] <= a[1] + a[3] + 1
  )
}

// Zona di contatto tra due box adiacenti (può degenerare in un segmento).
function portal(a: Rect, b: Rect): Rect {
  let x1 = Math.max(a[0], b[0])
  let y1 = Math.max(a[1], b[1])
  let x2 = Math.min(a[0] + a[2], b[0] + b[2])
  let y2 = Math.min(a[1] + a[3], b[1] + b[3])
  if (x2 < x1) x1 = x2 = (x1 + x2) / 2
  if (y2 < y1) y1 = y2 = (y1 + y2) / 2
  return [x1, y1, x2 - x1, y2 - y1]
}

// Percorso da `from` a `to` attraverso i walkbox: BFS sul grafo di adiacenza,
// waypoint sul portale tra un box e il successivo (il punto più vicino alla
// meta). Ritorna la lista di punti da percorrere in sequenza, meta inclusa.
// Lista vuota = meta non raggiungibile.
export function findPath(boxes: Rect[], from: Pt, to: Pt): Pt[] {
  const goal = nearestWalkable(boxes, to)
  const start = nearestWalkable(boxes, from)
  const si = boxes.findIndex((r) => contains(r, start))
  const gi = boxes.findIndex((r) => contains(r, goal))
  if (si === -1 || gi === -1) return []
  if (si === gi) return [goal]

  const prev = new Array<number>(boxes.length).fill(-1)
  const visited = new Array<boolean>(boxes.length).fill(false)
  visited[si] = true
  const queue = [si]
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur === gi) break
    for (let j = 0; j < boxes.length; j++) {
      if (!visited[j] && adjacent(boxes[cur], boxes[j])) {
        visited[j] = true
        prev[j] = cur
        queue.push(j)
      }
    }
  }
  if (!visited[gi]) return []

  const boxPath: number[] = []
  for (let i = gi; i !== -1; i = prev[i]) boxPath.unshift(i)

  const points: Pt[] = []
  for (let k = 0; k + 1 < boxPath.length; k++) {
    const p = portal(boxes[boxPath[k]], boxes[boxPath[k + 1]])
    points.push(clampToRect(p, goal))
  }
  points.push(goal)
  return points
}
