import { useState } from 'react'
import { chipClass, mutedText } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { isOverdue } from '../../lib/jobs'
import { useField } from '../../providers/data'
import type { JobStatus } from '../../types'
import { JobCard } from './JobCard'

type Filter = 'open' | 'done' | 'all'

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
]

const matches = (filter: Filter, status: JobStatus): boolean => (filter === 'all' ? true : filter === 'done' ? status === 'DONE' : status !== 'DONE')

export function JobsPage({ onGo }: { onGo: (to: Destination) => void }) {
  const { jobs, assets, items, now, settings, seeding } = useField()
  const [filter, setFilter] = useState<Filter>('open')
  const open = jobs.filter((j) => j.status !== 'DONE')
  const overdue = open.filter((j) => isOverdue(j, now)).length
  const shown = jobs.filter((j) => matches(filter, j.status))

  return (
    <section className="space-y-4" aria-labelledby="jobs-heading">
      <div>
        <h1 id="jobs-heading" className="text-2xl font-bold">
          Jobs
        </h1>
        <p className={`text-sm ${mutedText}`}>
          {settings.technician}: {open.length} open{overdue > 0 ? `, ${overdue} overdue` : ''}, {jobs.length - open.length} done
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jobs">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={chipClass(filter === f.id)} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} ({jobs.filter((j) => matches(f.id, j.status)).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={mutedText} role="status">
          {seeding ? 'Preparing the demo jobs…' : filter === 'done' ? 'No finished jobs yet.' : 'No jobs here. Load the demo jobs from Settings to try the app.'}
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Jobs">
          {shown.map((job) => (
            <li key={job.id}>
              <JobCard job={job} asset={assets.find((a) => a.id === job.assetId)} items={items.filter((i) => i.jobId === job.id)} now={now} onOpen={() => onGo({ job: job.id })} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
