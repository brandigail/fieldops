import { useEffect, useRef, useState } from 'react'
import { cardClass, errorText, fieldBase, mutedText } from '../../components/ui'
import { checklistProgress, RESULT_LABEL } from '../../lib/jobs'
import { useField } from '../../providers/data'
import type { CheckResult, ChecklistItem, Job } from '../../types'

const OPTIONS: readonly CheckResult[] = ['PASS', 'FAIL', 'NA']
const SAVE_DELAY_MS = 500

const ACTIVE: Record<CheckResult, string> = {
  PASS: 'border-emerald-700 bg-emerald-700 text-white',
  FAIL: 'border-red-700 bg-red-700 text-white',
  NA: 'border-slate-700 bg-slate-700 text-white dark:border-slate-300 dark:bg-slate-300 dark:text-slate-900',
}

function Row({ item, editable }: { item: ChecklistItem; editable: boolean }) {
  const { setResult, setNotes } = useField()
  const [draft, setDraft] = useState(item.notes)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const noteId = `note-${item.id}`
  const showNote = item.notes !== '' || draft !== '' || item.result === 'FAIL' || open

  // A pending save is flushed when the row goes away, so a note typed just before leaving the screen is not lost.
  const latest = useRef({ draft, saved: item.notes })
  useEffect(() => {
    latest.current = { draft, saved: item.notes }
  })
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        if (latest.current.draft !== latest.current.saved) void setNotes(item.id, latest.current.draft)
      }
    },
    [item.id, setNotes],
  )

  async function answer(result: CheckResult) {
    const outcome = await setResult(item.id, result)
    setError(outcome.ok ? null : outcome.error)
  }

  async function saveNote(value: string) {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    if (value === item.notes) return
    const outcome = await setNotes(item.id, value)
    setError(outcome.ok ? null : outcome.error)
  }

  const needsNote = item.result === 'FAIL' && draft.trim() === ''

  return (
    <li className="space-y-2 py-3" data-testid={`check-${item.id}`}>
      <p className="font-medium">{item.label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Result for ${item.label}`}>
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={!editable}
            aria-pressed={item.result === option}
            onClick={() => void answer(option)}
            className={`inline-flex min-h-11 min-w-20 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              item.result === option ? ACTIVE[option] : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {RESULT_LABEL[option]}
          </button>
        ))}
        {editable && !showNote && (
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm font-medium text-orange-800 hover:underline dark:text-orange-300" onClick={() => setOpen(true)}>
            Add note
          </button>
        )}
      </div>
      {showNote && (
        <div>
          <label htmlFor={noteId} className="text-sm font-medium">
            {item.result === 'FAIL' ? 'What is wrong? (required)' : 'Note'}
            <span className="sr-only"> for {item.label}</span>
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={500}
            readOnly={!editable}
            className={`${fieldBase} block w-full`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (timer.current !== null) window.clearTimeout(timer.current)
              const value = e.target.value
              timer.current = window.setTimeout(() => void saveNote(value), SAVE_DELAY_MS)
            }}
            onBlur={() => void saveNote(draft)}
          />
          {needsNote && editable && <p className={`text-sm ${errorText}`}>A failed item needs a note.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
    </li>
  )
}

export function ChecklistSection({ job, items }: { job: Job; items: ChecklistItem[] }) {
  const progress = checklistProgress(items)
  const editable = job.status === 'IN_PROGRESS'
  const sorted = [...items].sort((a, b) => a.order - b.order)
  return (
    <section className={`${cardClass} p-4`} aria-labelledby="checklist-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-heading" className="text-lg font-semibold">
          Checklist
        </h2>
        <p className={`text-sm ${mutedText}`} data-testid="checklist-progress">
          {progress.answered} of {progress.total} checked
          {progress.failed > 0 ? `, ${progress.failed} failed` : ''}
        </p>
      </div>
      {job.status === 'QUEUED' && <p className={`mt-1 text-sm ${mutedText}`}>Locked until you start the job.</p>}
      <ul className="mt-1 divide-y divide-slate-200 dark:divide-slate-800">
        {sorted.map((item) => (
          <Row key={item.id} item={item} editable={editable} />
        ))}
      </ul>
    </section>
  )
}
