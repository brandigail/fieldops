export interface Point {
  x: number
  y: number
}

/** Shortest ink that counts as a signature: a dot or a tiny scribble is not one. */
const MIN_INK_LENGTH = 60
const MIN_SPAN = 20

/** Total length of all strokes. */
export function inkLength(strokes: readonly (readonly Point[])[]): number {
  let total = 0
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      const a = stroke[i - 1]
      const b = stroke[i]
      if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y)
    }
  }
  return total
}

/** Width and height of the box around everything drawn. */
export function inkSpan(strokes: readonly (readonly Point[])[]): { width: number; height: number } {
  const points = strokes.flat()
  if (points.length === 0) return { width: 0, height: 0 }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

/** True when there is enough ink, spread out enough, to be a real signature. */
export function isSignature(strokes: readonly (readonly Point[])[]): boolean {
  const span = inkSpan(strokes)
  return inkLength(strokes) >= MIN_INK_LENGTH && Math.max(span.width, span.height) >= MIN_SPAN
}
