import { CheckCircle2, Eraser, Info } from 'lucide-react'
import { useId, useState } from 'react'
import { cardClass, errorText, inputClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { completionBlockers } from '../../lib/jobs'
import { isSignature, type Point } from '../../lib/signature'
import { useField } from '../../providers/data'
import type { ChecklistItem, Job } from '../../types'
import { signaturePng } from './render'
import { SignaturePad } from './SignaturePad'

export function SignOffSection({ job, items }: { job: Job; items: ChecklistItem[] }) {
  const { completeJob } = useField()
  const photoCount = useLiveQuery(() => db.photos.where('jobId').equals(job.id).count(), [job.id])
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameId = useId()
  const blockers = completionBlockers(items, photoCount ?? 0)
  const signed = isSignature(strokes)

  async function submit() {
    if (!signed) {
      setError('Draw the signature in the box first.')
      return
    }
    if (name.trim() === '') {
      setError('Type the name of the person signing.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await completeJob(job.id, signaturePng(strokes), name)
    // On success the job becomes "done" and this section disappears, so only a failure needs to be shown.
    if (!result.ok) {
      setError(result.error)
      setSaving(false)
    }
  }

  return (
    <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="signoff-heading">
      <h2 id="signoff-heading" className="text-lg font-semibold">
        Sign-off
      </h2>

      {blockers.length > 0 ? (
        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40" data-testid="blockers">
          <p className="flex items-center gap-1.5 font-semibold">
            <Info className="size-4" aria-hidden /> Before you can sign off
          </p>
          <ul className="list-disc pl-6">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300" data-testid="ready-to-sign">
          <CheckCircle2 className="size-4" aria-hidden /> The checklist is complete. Hand the phone to the customer to sign.
        </p>
      )}

      <div>
        <p className="text-sm font-medium" id={`${nameId}-pad`}>
          Signature
        </p>
        <SignaturePad strokes={strokes} onChange={setStrokes} label="Signature pad: draw with a finger or mouse" />
        <button type="button" className={`${secondaryButton} mt-2`} onClick={() => setStrokes([])} disabled={strokes.length === 0}>
          <Eraser className="size-4" aria-hidden /> Clear signature
        </button>
      </div>

      <div>
        <label htmlFor={nameId} className="text-sm font-medium">
          Signed by
        </label>
        <input id={nameId} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder="Full name of the person signing" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} onClick={() => void submit()} disabled={blockers.length > 0 || saving} data-testid="complete-job">
          {saving ? 'Saving…' : 'Sign off and complete job'}
        </button>
        <p className={`text-sm ${mutedText}`}>The report is saved on this device first.</p>
      </div>
      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
    </section>
  )
}
