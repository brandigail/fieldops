import { AlertTriangle, Clock, MapPin } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '../../components/Badges'
import { cardClass, mutedText } from '../../components/ui'
import { formatDue } from '../../lib/format'
import { checklistProgress, isOverdue } from '../../lib/jobs'
import type { Asset, ChecklistItem, Job } from '../../types'

interface Props {
  job: Job
  asset: Asset | undefined
  items: ChecklistItem[]
  now: number
  onOpen: () => void
}

/** One row of the dispatch queue. The whole card is one button, so it is a large, easy tap target. */
export function JobCard({ job, asset, items, now, onOpen }: Props) {
  const overdue = isOverdue(job, now)
  const progress = checklistProgress(items)
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`job-card-${job.id}`}
      className={`${cardClass} block w-full space-y-2 p-4 text-left transition-colors hover:border-orange-400 dark:hover:border-orange-700 ${overdue ? 'border-l-4 border-l-red-600' : ''}`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={job.priority} />
        <StatusBadge status={job.status} />
      </span>
      <span className="block text-base font-semibold">{job.title}</span>
      <span className={`flex items-start gap-1.5 text-sm ${mutedText}`}>
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {job.siteAddress}
          {asset ? `, ${asset.name}` : ''}
        </span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-red-700 dark:text-red-400' : mutedText}`}>
          {overdue ? <AlertTriangle className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
          {formatDue(job.dueAt, now, job.status === 'DONE')}
        </span>
        {job.status === 'IN_PROGRESS' && (
          <span className={mutedText}>
            {progress.answered} of {progress.total} checked
          </span>
        )}
      </span>
    </button>
  )
}
