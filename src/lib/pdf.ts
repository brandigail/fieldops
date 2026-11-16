import type { CheckResult } from '../types'
import { formatDateTime, toPdfText } from './format'

export interface PdfPhoto {
  dataUrl: string
  /** Time and place lines that were stamped on the picture. */
  caption: [string, string]
}

export interface PdfInput {
  title: string
  siteAddress: string
  assetName: string
  assetType: string
  assetLocation: string
  priority: string
  technician: string
  completedAt: string
  signedBy: string
  signaturePng: string
  items: { label: string; result: CheckResult | null; notes: string }[]
  photos: PdfPhoto[]
}

const MARGIN = 15
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2
const ORANGE: [number, number, number] = [194, 65, 12]
const RESULT_TEXT: Record<CheckResult, string> = { PASS: 'PASS', FAIL: 'FAIL', NA: 'N/A' }

/** Builds the one-page-or-more inspection summary. jsPDF is loaded only now, so it never slows the first visit. */
export async function buildReportPdf(input: PdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - 18) {
      doc.addPage()
      y = MARGIN
    }
  }
  const text = (value: string, x: number, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [30, 30, 30]) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(toPdfText(value), x, y)
  }

  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, PAGE_W, 30, 'F')
  y = 13
  text('Inspection report', MARGIN, 11, 'normal', [255, 237, 213])
  y = 23
  text(input.title, MARGIN, 18, 'bold', [255, 255, 255])
  y = 40

  const facts: [string, string][] = [
    ['Site', input.siteAddress],
    ['Asset', `${input.assetName} (${input.assetType})`],
    ['Asset location', input.assetLocation],
    ['Priority', input.priority],
    ['Technician', input.technician],
    ['Completed', formatDateTime(input.completedAt)],
  ]
  for (const [label, value] of facts) {
    text(label, MARGIN, 10, 'bold', [100, 100, 100])
    const lines = doc.splitTextToSize(toPdfText(value), CONTENT_W - 38) as string[]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(lines, MARGIN + 38, y)
    y += Math.max(1, lines.length) * 5 + 1.5
  }

  const failed = input.items.filter((i) => i.result === 'FAIL').length
  const passed = input.items.filter((i) => i.result === 'PASS').length
  y += 3
  text('Checklist', MARGIN, 13, 'bold', ORANGE)
  y += 2
  text(`${passed} passed, ${failed} failed, ${input.items.length - passed - failed} not applicable`, MARGIN, 9, 'normal', [100, 100, 100])
  y += 6

  for (const item of input.items) {
    const labelLines = doc.splitTextToSize(toPdfText(item.label), CONTENT_W - 28) as string[]
    const noteLines = item.notes.trim() === '' ? [] : (doc.splitTextToSize(toPdfText(`Note: ${item.notes.trim()}`), CONTENT_W - 28) as string[])
    const height = (labelLines.length + noteLines.length) * 4.6 + 2.4
    ensure(height)
    const result = item.result === null ? 'NOT DONE' : RESULT_TEXT[item.result]
    const color: [number, number, number] = item.result === 'FAIL' ? [185, 28, 28] : item.result === 'PASS' ? [21, 128, 61] : [100, 100, 100]
    text(result, MARGIN, 9, 'bold', color)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(labelLines, MARGIN + 28, y)
    if (noteLines.length > 0) {
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 90)
      doc.text(noteLines, MARGIN + 28, y + labelLines.length * 4.6)
    }
    y += height
    doc.setDrawColor(230, 230, 230)
    doc.line(MARGIN, y - 1.6, PAGE_W - MARGIN, y - 1.6)
  }

  if (input.photos.length > 0) {
    ensure(20)
    y += 4
    text('Photos', MARGIN, 13, 'bold', ORANGE)
    y += 5
    const cell = (CONTENT_W - 6) / 2
    for (let i = 0; i < input.photos.length; i += 2) {
      const row = input.photos.slice(i, i + 2)
      const rowHeight = Math.max(
        ...row.map((photo) => {
          const props = doc.getImageProperties(photo.dataUrl)
          return Math.min(cell * (props.height / props.width), 90)
        }),
      )
      ensure(rowHeight + 14)
      row.forEach((photo, col) => {
        const props = doc.getImageProperties(photo.dataUrl)
        const h = Math.min(cell * (props.height / props.width), 90)
        const w = h * (props.width / props.height)
        const x = MARGIN + col * (cell + 6)
        doc.addImage(photo.dataUrl, 'JPEG', x, y, w, h)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(90, 90, 90)
        doc.text(toPdfText(photo.caption[0]), x, y + h + 4)
        doc.text(toPdfText(photo.caption[1]), x, y + h + 8)
      })
      y += rowHeight + 13
    }
  }

  ensure(58)
  y += 6
  text('Sign-off', MARGIN, 13, 'bold', ORANGE)
  y += 4
  doc.setDrawColor(180, 180, 180)
  doc.rect(MARGIN, y, 90, 34)
  doc.addImage(input.signaturePng, 'PNG', MARGIN + 2, y + 2, 86, 30, undefined, 'FAST')
  y += 40
  text(`Signed by ${input.signedBy}`, MARGIN, 10, 'bold')
  y += 5
  text(formatDateTime(input.completedAt), MARGIN, 9, 'normal', [100, 100, 100])

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 140)
    doc.text(`Generated by FieldOps. Page ${page} of ${pages}`, MARGIN, PAGE_H - 8)
  }
  return doc.output('blob')
}
