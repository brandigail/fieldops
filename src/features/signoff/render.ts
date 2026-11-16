import type { Point } from '../../lib/signature'

/** Strokes live in a fixed 600 by 200 space, so the signature looks the same on any screen size or after a rotation. */
export const PAD_WIDTH = 600
export const PAD_HEIGHT = 200
export const SCALE = 2
/** The pad is always paper white, in both themes, so the ink is always dark. */
export const INK = '#111827'

export type Strokes = Point[][]

export function paint(canvas: HTMLCanvasElement, strokes: Strokes, ink: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT)
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    const first = stroke[0]
    if (!first) continue
    if (stroke.length === 1) {
      ctx.beginPath()
      ctx.arc(first.x, first.y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
}

/** The signature as a transparent PNG with dark ink, ready to be placed on a white PDF page. */
export function signaturePng(strokes: Strokes): string {
  const canvas = document.createElement('canvas')
  canvas.width = PAD_WIDTH * SCALE
  canvas.height = PAD_HEIGHT * SCALE
  paint(canvas, strokes, INK)
  return canvas.toDataURL('image/png')
}
