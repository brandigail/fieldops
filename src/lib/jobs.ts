import type { CheckResult, ChecklistItem, Job, JobStatus, Priority } from '../types'

const STATUS_RANK: Record<JobStatus, number> = { IN_PROGRESS: 0, QUEUED: 1, DONE: 2 }
const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
export const STATUS_LABEL: Record<JobStatus, string> = { QUEUED: 'Queued', IN_PROGRESS: 'In progress', DONE: 'Done' }
export const RESULT_LABEL: Record<CheckResult, string> = { PASS: 'Pass', FAIL: 'Fail', NA: 'N/A' }

/**
 * The order a technician works in: the job already under way first, then queued jobs by priority and due time,
 * finished jobs last (most recently due first). Returns a new array.
 */
export function sortJobs(jobs: readonly Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (a.status === 'DONE') return Date.parse(b.dueAt) - Date.parse(a.dueAt)
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    return Date.parse(a.dueAt) - Date.parse(b.dueAt)
  })
}

/** A job that is not done and whose due time has passed. */
export function isOverdue(job: Job, now: number): boolean {
  return job.status !== 'DONE' && Date.parse(job.dueAt) < now
}

export interface Progress {
  total: number
  answered: number
  passed: number
  failed: number
  /** Failed items that still have no note. */
  failedWithoutNote: number
}

export function checklistProgress(items: readonly ChecklistItem[]): Progress {
  let answered = 0
  let passed = 0
  let failed = 0
  let failedWithoutNote = 0
  for (const item of items) {
    if (item.result === null) continue
    answered += 1
    if (item.result === 'PASS') passed += 1
    if (item.result === 'FAIL') {
      failed += 1
      if (item.notes.trim() === '') failedWithoutNote += 1
    }
  }
  return { total: items.length, answered, passed, failed, failedWithoutNote }
}

/** What stops a job from being signed off. An empty list means it can be completed. */
export function completionBlockers(items: readonly ChecklistItem[], photoCount: number): string[] {
  const progress = checklistProgress(items)
  const reasons: string[] = []
  if (progress.total === 0) reasons.push('This job has no checklist.')
  const unanswered = progress.total - progress.answered
  if (unanswered > 0) reasons.push(`${unanswered} checklist ${unanswered === 1 ? 'item is' : 'items are'} not answered.`)
  if (progress.failedWithoutNote > 0) {
    reasons.push(`${progress.failedWithoutNote} failed ${progress.failedWithoutNote === 1 ? 'item needs' : 'items need'} a note saying what is wrong.`)
  }
  if (progress.failed > 0 && photoCount === 0) reasons.push('Add at least one photo of the problem.')
  return reasons
}
