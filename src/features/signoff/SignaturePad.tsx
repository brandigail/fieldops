import { useEffect, useRef, type PointerEvent } from 'react'
import type { Point } from '../../lib/signature'
import { INK, PAD_HEIGHT, PAD_WIDTH, paint, SCALE, type Strokes } from './render'

interface Props {
  strokes: Strokes
  onChange: (strokes: Strokes) => void
  label: string
}

/**
 * A drawing surface that works with a finger, a pen or a mouse. `touch-action: none` stops the page from scrolling
 * while someone signs. It is controlled: the strokes are kept by the parent, so clearing is just passing an empty list.
 */
export function SignaturePad({ strokes, onChange, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  // The newest strokes, updated the moment a point is added. Moves can arrive faster than React re-renders, and
  // building the next list from the props alone would drop points.
  const current = useRef(strokes)

  useEffect(() => {
    current.current = strokes
    const canvas = canvasRef.current
    if (canvas) paint(canvas, strokes, INK)
  }, [strokes])

  function commit(next: Strokes) {
    current.current = next
    onChange(next)
  }

  function pointFrom(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH, y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT }
  }

  function down(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    commit([...current.current, [pointFrom(event)]])
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const last = current.current[current.current.length - 1]
    if (!last) return
    commit([...current.current.slice(0, -1), [...last, pointFrom(event)]])
  }

  function up() {
    drawing.current = false
  }

  return (
    <canvas
      ref={canvasRef}
      width={PAD_WIDTH * SCALE}
      height={PAD_HEIGHT * SCALE}
      aria-label={label}
      role="img"
      data-testid="signature-pad"
      className="block aspect-[3/1] w-full touch-none rounded-lg border-2 border-dashed border-slate-400 bg-white dark:border-slate-500"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  )
}
