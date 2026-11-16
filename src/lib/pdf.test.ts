import { describe, expect, it } from 'vitest'
import { buildReportPdf, type PdfInput } from './pdf'

// A 1x1 PNG and a 1x1 JPEG, enough for the PDF library to embed.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='

function input(over: Partial<PdfInput> = {}): PdfInput {
  return {
    title: 'Quarterly service: backup generator',
    siteAddress: 'Northgate Plaza, 14 Main Road',
    assetName: 'Generator G-2',
    assetType: 'Backup generator',
    assetLocation: 'Plant room',
    priority: 'High',
    technician: 'Sam Technician',
    completedAt: '2026-11-16T12:00:00.000Z',
    signedBy: 'Site manager',
    signaturePng: PNG,
    items: [
      { label: 'Oil level', result: 'PASS', notes: '' },
      { label: 'Battery terminals', result: 'FAIL', notes: 'Corroded ✓ clamp needs replacing' },
      { label: 'Exhaust clear', result: 'NA', notes: '' },
    ],
    photos: [],
    ...over,
  }
}

async function head(blob: Blob): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
}

describe('buildReportPdf', () => {
  it('produces a real PDF, even with characters the PDF font cannot draw', async () => {
    const blob = await buildReportPdf(input())
    expect(await head(blob)).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(2000)
  })

  it('embeds photos and grows with them', async () => {
    const plain = await buildReportPdf(input())
    const photo = { dataUrl: JPEG, caption: ['2026-11-16 09:00:00', 'Location not available'] as [string, string] }
    const withPhotos = await buildReportPdf(input({ photos: [photo, photo, photo] }))
    expect(await head(withPhotos)).toBe('%PDF-')
    expect(withPhotos.size).toBeGreaterThan(plain.size)
  })

  it('copes with a long checklist that needs more than one page', async () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ label: `Check number ${i + 1} on the asset, with a longer description to wrap`, result: 'PASS' as const, notes: i % 7 === 0 ? 'A note on this one' : '' }))
    const long = await buildReportPdf(input({ items }))
    const short = await buildReportPdf(input())
    expect(long.size).toBeGreaterThan(short.size)
    const text = new TextDecoder('latin1').decode(new Uint8Array(await long.arrayBuffer()))
    expect(text).toMatch(/\/Count [2-9]/)
  })
})
