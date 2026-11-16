import { describe, expect, it } from 'vitest'
import { formatDue, slug, toPdfText } from './format'

const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime()
const at = (days: number, h: number, m = 0) => new Date(2026, 10, 16 + days, h, m, 0).toISOString()

describe('formatDue', () => {
  it('says how late an unfinished job is', () => {
    expect(formatDue(at(0, 9, 40), NOW)).toBe('Overdue by under an hour')
    expect(formatDue(at(0, 8), NOW)).toBe('Overdue by 2 h')
    expect(formatDue(at(-1, 10), NOW)).toBe('Overdue by 1 day')
    expect(formatDue(at(-3, 10), NOW)).toBe('Overdue by 3 days')
  })

  it('names today and tomorrow', () => {
    expect(formatDue(at(0, 14), NOW)).toBe('Today 14:00')
    expect(formatDue(at(1, 9), NOW)).toBe('Tomorrow 09:00')
  })

  it('shows a finished job as when it was due, never overdue', () => {
    expect(formatDue(at(-1, 8), NOW, true)).toBe('Yesterday 08:00')
  })

  it('uses a date for later days', () => {
    expect(formatDue(at(4, 11), NOW)).toMatch(/20/)
    expect(formatDue(at(4, 11), NOW)).toMatch(/11:00$/)
  })
})

describe('slug', () => {
  it('makes a safe file name', () => {
    expect(slug('Generator service, Block B!')).toBe('generator-service-block-b')
    expect(slug('***')).toBe('report')
  })
})

describe('toPdfText', () => {
  it('keeps Latin-1 and swaps everything else for a question mark', () => {
    expect(toPdfText('Cafe ± 5° é')).toBe('Cafe ± 5° é')
    expect(toPdfText('Pump ✓ ok \u{1F600}')).toBe('Pump ? ok ?')
    expect(toPdfText('a\nb')).toBe('a\nb')
  })
})
