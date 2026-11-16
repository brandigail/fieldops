import { useId, useState } from 'react'
import { cardClass, dangerButton, errorText, inputClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { useField } from '../../providers/data'

export function SettingsPage() {
  const { settings, saveSettings, loadDemo, clearAll, jobs, reports } = useField()
  const [name, setName] = useState(settings.technician)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [pending, setPending] = useState<'demo' | 'clear' | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const nameId = useId()

  async function save() {
    const result = await saveSettings(name)
    setMessage(result.ok ? { text: 'Saved.', error: false } : { text: result.error, error: true })
  }

  async function confirm() {
    if (pending === 'demo') {
      await loadDemo()
      setDone('Loaded the eight demo jobs.')
    } else {
      await clearAll()
      setDone('All jobs, photos and reports were deleted from this device.')
    }
    setPending(null)
  }

  return (
    <section className="space-y-4" aria-labelledby="settings-heading">
      <h1 id="settings-heading" className="text-2xl font-bold">
        Settings
      </h1>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="tech-heading">
        <h2 id="tech-heading" className="text-lg font-semibold">
          Technician
        </h2>
        <div>
          <label htmlFor={nameId} className="text-sm font-medium">
            Your name
          </label>
          <input id={nameId} className={`${inputClass} max-w-sm`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          <p className={`mt-1 text-sm ${mutedText}`}>It goes on every report you sign off.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} onClick={() => void save()} data-testid="save-settings">
            Save
          </button>
          {message && (
            <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? errorText : mutedText}`}>
              {message.text}
            </p>
          )}
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-lg font-semibold">
          Your data
        </h2>
        <p className={`text-sm ${mutedText}`}>
          Everything is stored only in this browser, on this device ({jobs.length} jobs and {reports.length} reports). Nothing is uploaded: syncing to a server is not built yet, so clearing browser data removes it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setPending('demo')}>
            Load demo jobs
          </button>
          <button type="button" className={secondaryButton} onClick={() => setPending('clear')}>
            Delete everything
          </button>
        </div>
        {pending && (
          <div role="alertdialog" aria-label="Confirm" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm">{pending === 'demo' ? 'This replaces every job, photo and report on this device with the eight demo jobs.' : 'This deletes every job, photo and report on this device. This cannot be undone.'}</p>
            <div className="flex gap-2">
              <button type="button" className={pending === 'clear' ? dangerButton : primaryButton} onClick={() => void confirm()} autoFocus>
                {pending === 'demo' ? 'Load demo jobs' : 'Delete everything'}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {done && (
          <p role="status" className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {done}
          </p>
        )}
      </section>
    </section>
  )
}
