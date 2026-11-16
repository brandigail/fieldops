import { CloudOff, FileDown } from 'lucide-react'
import { useState } from 'react'
import { cardClass, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { formatDateTime } from '../../lib/format'
import { useField } from '../../providers/data'
import { downloadReportPdf } from './exportPdf'

export function ReportsPage({ onGo }: { onGo: (to: Destination) => void }) {
  const { reports, jobs, assets } = useField()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sorted = [...reports].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
  const waiting = reports.filter((r) => !r.synced).length

  async function download(reportId: string) {
    const report = reports.find((r) => r.id === reportId)
    const job = jobs.find((j) => j.id === report?.jobId)
    if (!report || !job) return
    setBusy(reportId)
    setError(null)
    try {
      await downloadReportPdf(job, assets.find((a) => a.id === job.assetId), report)
    } catch {
      setError('The PDF could not be made. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="reports-heading">
      <div>
        <h1 id="reports-heading" className="text-2xl font-bold">
          Reports
        </h1>
        <p className={`text-sm ${mutedText}`}>Signed-off jobs. {waiting > 0 ? `${waiting} saved on this device and waiting to sync.` : 'Everything is synced.'}</p>
      </div>
      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
      {sorted.length === 0 ? (
        <p className={mutedText} role="status">
          No signed-off jobs yet. Finish a job and its report appears here.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Reports">
          {sorted.map((report) => {
            const job = jobs.find((j) => j.id === report.jobId)
            return (
              <li key={report.id} className={`${cardClass} space-y-2 p-4`} data-testid="report-item">
                <p className="font-semibold">{job?.title ?? 'Removed job'}</p>
                <p className={`text-sm ${mutedText}`}>
                  Signed by {report.signedBy} on {formatDateTime(report.completedAt)}
                </p>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${report.synced ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                  <CloudOff className="size-3.5" aria-hidden /> {report.synced ? 'Synced' : 'Saved on this device, waiting to sync'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={primaryButton} onClick={() => void download(report.id)} disabled={busy === report.id || !job}>
                    <FileDown className="size-4" aria-hidden /> {busy === report.id ? 'Making the PDF…' : 'Download PDF'}
                  </button>
                  {job && (
                    <button type="button" className={secondaryButton} onClick={() => onGo({ job: job.id })}>
                      Open job
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
