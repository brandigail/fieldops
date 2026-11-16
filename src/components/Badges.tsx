import { PRIORITY_LABEL, STATUS_LABEL } from '../lib/jobs'
import type { JobStatus, Priority } from '../types'

const PRIORITY_STYLE: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  MEDIUM: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200',
  LOW: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
}

const STATUS_STYLE: Record<JobStatus, string> = {
  QUEUED: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
  IN_PROGRESS: 'bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-200',
  DONE: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200',
}

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold'

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${BASE} ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]} priority</span>
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`${BASE} ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}
