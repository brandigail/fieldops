import { ArrowLeft, Clock, FileDown, MapPin, Play, Wrench } from 'lucide-react'
import { useState } from 'react'
import { PriorityBadge, StatusBadge } from '../../components/Badges'
import { cardClass, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { formatDateTime, formatDue } from '../../lib/format'
import { isOverdue } from '../../lib/jobs'
import { useField } from '../../providers/data'
import { PhotosSection } from '../photos/PhotosSection'
import { downloadReportPdf } from '../reports/exportPdf'
import { SignOffSection } from '../signoff/SignOffSection'
import { ChecklistSection } from './ChecklistSection'

export function JobPage({ id, onGo }: { id: string; onGo: (to: Destination) => void }) {
  const { jobs, assets, items, reports, now, startJob } = useField()
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const job = jobs.find((j) => j.id === id)

  if (!job) {
    return (
      <section className="space-y-3">
        <p role="alert">That job was not found. It may have been removed.</p>
        <button type="button" className={secondaryButton} onClick={() => onGo('jobs')}>
          Back to jobs
        </button>
      </section>
    )
  }

  const asset = assets.find((a) => a.id === job.assetId)
  const jobItems = items.filter((i) => i.jobId === job.id)
  const report = reports.find((r) => r.jobId === job.id)
  const overdue = isOverdue(job, now)

  async function start() {
    const result = await startJob(job?.id ?? '')
    setError(result.ok ? null : result.error)
  }

  async function exportPdf() {
    if (!job || !report) return
    setExporting(true)
    setError(null)
    try {
      await downloadReportPdf(job, asset, report)
    } catch {
      setError('The PDF could not be made. Try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <article className="space-y-4" aria-labelledby="job-heading">
      <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-orange-800 hover:underline dark:text-orange-300" onClick={() => onGo('jobs')}>
        <ArrowLeft className="size-4" aria-hidden /> Jobs
      </button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={job.priority} />
          <StatusBadge status={job.status} />
        </div>
        <h1 id="job-heading" className="text-2xl font-bold">
          {job.title}
        </h1>
        <p className={`flex items-start gap-1.5 text-sm ${mutedText}`}>
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {job.siteAddress}.{' '}
            <a className="font-medium text-orange-800 underline dark:text-orange-300" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(job.siteAddress)}`} target="_blank" rel="noopener noreferrer">
              Find on map
            </a>
          </span>
        </p>
        <p className={`flex items-center gap-1.5 text-sm font-medium ${overdue ? 'text-red-700 dark:text-red-400' : mutedText}`}>
          <Clock className="size-4" aria-hidden /> {formatDue(job.dueAt, now, job.status === 'DONE')}
        </p>
      </header>

      {asset && (
        <section className={`${cardClass} flex items-start gap-3 p-4`} aria-label="Asset">
          <Wrench className="mt-0.5 size-5 shrink-0 text-orange-700 dark:text-orange-400" aria-hidden />
          <div>
            <p className="font-semibold">{asset.name}</p>
            <p className={`text-sm ${mutedText}`}>
              {asset.type}. {asset.location}.
            </p>
          </div>
        </section>
      )}

      {job.status === 'QUEUED' && (
        <section className={`${cardClass} space-y-3 border-orange-300 p-4 dark:border-orange-800`}>
          <p className="text-sm">Start the job to fill in the checklist, take photos and sign it off.</p>
          <button type="button" className={primaryButton} onClick={() => void start()} data-testid="start-job">
            <Play className="size-4" aria-hidden /> Start job
          </button>
        </section>
      )}

      {job.status === 'DONE' && report && (
        <section className={`${cardClass} space-y-3 border-emerald-400 p-4 dark:border-emerald-800`} aria-label="Sign-off" data-testid="signed-off">
          <p className="font-semibold text-emerald-900 dark:text-emerald-300">Signed off by {report.signedBy}</p>
          <p className={`text-sm ${mutedText}`}>
            {formatDateTime(report.completedAt)}. Technician: {report.technician}. {report.synced ? 'Synced.' : 'Saved on this device, waiting to sync.'}
          </p>
          <img src={report.signaturePng} alt={`Signature of ${report.signedBy}`} className="h-24 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700" />
          <button type="button" className={primaryButton} onClick={() => void exportPdf()} disabled={exporting} data-testid="export-pdf">
            <FileDown className="size-4" aria-hidden /> {exporting ? 'Making the PDF…' : 'Download PDF summary'}
          </button>
        </section>
      )}

      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}

      <ChecklistSection job={job} items={jobItems} />
      <PhotosSection job={job} />
      {job.status === 'IN_PROGRESS' && <SignOffSection job={job} items={jobItems} />}
    </article>
  )
}
