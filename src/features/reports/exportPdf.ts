import { db } from '../../db/schema'
import { jobItems, listPhotos } from '../../db/repo'
import { blobToDataUrl, slug } from '../../lib/format'
import { PRIORITY_LABEL } from '../../lib/jobs'
import { buildReportPdf } from '../../lib/pdf'
import { stampLines } from '../../lib/stamp'
import type { Asset, Job, Report } from '../../types'

/** Gathers a signed-off job's checklist and photos, builds the PDF and hands it to the browser as a download. */
export async function downloadReportPdf(job: Job, asset: Asset | undefined, report: Report): Promise<void> {
  const [items, photos] = await Promise.all([jobItems(db, job.id), listPhotos(db, job.id)])
  const pdfPhotos = await Promise.all(
    photos.map(async (photo) => ({
      dataUrl: await blobToDataUrl(photo.blob),
      caption: stampLines(
        new Date(photo.takenAt),
        photo.lat !== null && photo.lng !== null ? { lat: photo.lat, lng: photo.lng, accuracyM: photo.accuracyM } : null,
      ),
    })),
  )
  const blob = await buildReportPdf({
    title: job.title,
    siteAddress: job.siteAddress,
    assetName: asset?.name ?? 'Unknown asset',
    assetType: asset?.type ?? '',
    assetLocation: asset?.location ?? '',
    priority: PRIORITY_LABEL[job.priority],
    technician: report.technician,
    completedAt: report.completedAt,
    signedBy: report.signedBy,
    signaturePng: report.signaturePng,
    items: items.map((i) => ({ label: i.label, result: i.result, notes: i.notes })),
    photos: pdfPhotos,
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slug(job.title)}.pdf`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
