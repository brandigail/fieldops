import { describe, expect, it } from 'vitest'
import { inkLength, inkSpan, isSignature } from './signature'

describe('signature ink', () => {
  it('measures the length of strokes and ignores single points', () => {
    expect(inkLength([[{ x: 0, y: 0 }, { x: 3, y: 4 }], [{ x: 10, y: 10 }]])).toBe(5)
    expect(inkLength([])).toBe(0)
  })

  it('measures the box around everything drawn', () => {
    expect(inkSpan([[{ x: 5, y: 7 }, { x: 25, y: 12 }], [{ x: 0, y: 30 }]])).toEqual({ width: 25, height: 23 })
    expect(inkSpan([])).toEqual({ width: 0, height: 0 })
  })

  it('rejects a dot, a tiny scribble and an empty pad', () => {
    expect(isSignature([])).toBe(false)
    expect(isSignature([[{ x: 5, y: 5 }]])).toBe(false)
    expect(isSignature([[{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 5, y: 5 }]])).toBe(false)
  })

  it('accepts a real stroke, even across two strokes', () => {
    expect(isSignature([[{ x: 0, y: 0 }, { x: 80, y: 10 }]])).toBe(true)
    expect(isSignature([[{ x: 0, y: 0 }, { x: 40, y: 20 }], [{ x: 50, y: 0 }, { x: 90, y: 30 }]])).toBe(true)
  })

  it('rejects a long line that stays on one spot', () => {
    const jitter = Array.from({ length: 40 }, (_, i) => ({ x: i % 2 === 0 ? 0 : 3, y: 0 }))
    expect(inkLength([jitter])).toBeGreaterThan(60)
    expect(isSignature([jitter])).toBe(false)
  })
})
