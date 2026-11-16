import type { DemoWithPhotos } from '../db/repo'
import type { Photo } from '../types'
import { buildDemo } from './demo'
import { stampImage, type Fix } from './stamp'

/** A hand-drawn looking squiggle, so the demo's signed reports have a signature to show. */
function demoSignature(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 140
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'data:image/png;base64,iVBORw0KGgo='
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(30, 90)
  ctx.bezierCurveTo(50, 20, 80, 20, 90, 80)
  ctx.bezierCurveTo(95, 110, 120, 110, 135, 60)
  ctx.bezierCurveTo(150, 20, 170, 100, 200, 80)
  ctx.bezierCurveTo(230, 60, 240, 100, 280, 70)
  ctx.bezierCurveTo(310, 50, 330, 95, 370, 85)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(40, 112)
  ctx.lineTo(340, 108)
  ctx.stroke()
  return canvas.toDataURL('image/png')
}

/** A plain stand-in "site photo": a dark scene with a few shapes. The real stamp is burned on top, like a live photo. */
async function demoPhoto(label: string, shade: number, takenAt: Date, fix: Fix | null): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 720
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')
  const sky = ctx.createLinearGradient(0, 0, 0, 720)
  sky.addColorStop(0, `hsl(${shade}, 25%, 38%)`)
  sky.addColorStop(1, `hsl(${shade}, 20%, 14%)`)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 960, 720)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(120, 220, 460, 300)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(160, 260, 160, 220)
  ctx.fillRect(360, 300, 180, 140)
  ctx.fillStyle = '#fb923c'
  ctx.beginPath()
  ctx.arc(700, 360, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '600 34px system-ui, sans-serif'
  ctx.fillText(label, 60, 90)
  ctx.font = '22px system-ui, sans-serif'
  ctx.fillText('Demo picture, not a real site photo', 60, 130)
  return stampImage(canvas, 960, 720, takenAt, fix)
}

/** The demo queue plus its generated media. Browser only, because it draws on canvases. */
export async function buildDemoWithMedia(now: number): Promise<DemoWithPhotos> {
  const demo = buildDemo(now, demoSignature())
  const started = demo.jobs.find((j) => j.id === 'job-1')?.startedAt
  const base = started ? Date.parse(started) : now - 3_600_000
  const site: Fix = { lat: -26.1076, lng: 28.0567, accuracyM: 9 }
  const specs: { id: string; label: string; shade: number; at: number; fix: Fix | null }[] = [
    { id: 'demo-photo-1', label: 'Generator G-2, front panel', shade: 215, at: base + 20 * 60_000, fix: site },
    { id: 'demo-photo-2', label: 'Corroded battery terminal', shade: 20, at: base + 41 * 60_000, fix: null },
  ]
  const photos: Photo[] = []
  for (const spec of specs) {
    const takenAt = new Date(spec.at)
    photos.push({
      id: spec.id,
      jobId: 'job-1',
      blob: await demoPhoto(spec.label, spec.shade, takenAt, spec.fix),
      takenAt: takenAt.toISOString(),
      lat: spec.fix?.lat ?? null,
      lng: spec.fix?.lng ?? null,
      accuracyM: spec.fix?.accuracyM ?? null,
    })
  }
  return { ...demo, photos }
}
