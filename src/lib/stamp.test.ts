import { describe, expect, it } from 'vitest'
import { fitWithin, formatFix, stampLines } from './stamp'

describe('formatFix', () => {
  it('writes hemispheres and rounds the accuracy', () => {
    expect(formatFix({ lat: -26.2041, lng: 28.0473, accuracyM: 11.6 })).toBe('26.20410° S, 28.04730° E (±12 m)')
    expect(formatFix({ lat: 51.5, lng: -0.12, accuracyM: null })).toBe('51.50000° N, 0.12000° W')
  })

  it('says plainly when there is no location', () => {
    expect(formatFix(null)).toBe('Location not available')
  })
})

describe('stampLines', () => {
  it('gives the local time with seconds and the place', () => {
    const lines = stampLines(new Date(2026, 10, 16, 9, 5, 7), { lat: 1, lng: 2, accuracyM: 5 })
    expect(lines).toEqual(['2026-11-16 09:05:07', '1.00000° N, 2.00000° E (±5 m)'])
  })

  it('flags a missing location', () => {
    expect(stampLines(new Date(2026, 0, 2, 3, 4, 5), null)[1]).toBe('Location not available')
  })
})

describe('fitWithin', () => {
  it('shrinks the long side and keeps the proportions', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 })
  })

  it('never enlarges a small picture', () => {
    expect(fitWithin(640, 480, 1280)).toEqual({ width: 640, height: 480 })
  })
})
