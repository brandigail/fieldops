import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ImagePlus, MapPinOff, Trash2 } from 'lucide-react'
import { memo, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { cardClass, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { listPhotos } from '../../db/repo'
import { db } from '../../db/schema'
import { formatDateTime } from '../../lib/format'
import { FAILURE_TEXT, readPosition } from '../../lib/geo'
import { formatFix, stampFile } from '../../lib/stamp'
import { useField } from '../../providers/data'
import type { Job, Photo } from '../../types'
import { CameraDialog, type Capture } from './CameraDialog'

/** Shows one saved picture. Memoised on the id: a picture never changes, so it is never rebuilt when the list refreshes. */
const PhotoImage = memo(
  function PhotoImage({ photo, alt }: { photo: Photo; alt: string }) {
    const ref = useRef<HTMLImageElement>(null)
    // The picture is handed to the <img> directly and released when it goes away: the browser, not React, owns the URL.
    useEffect(() => {
      const img = ref.current
      if (!img) return
      const url = URL.createObjectURL(photo.blob)
      img.src = url
      return () => {
        URL.revokeObjectURL(url)
        img.removeAttribute('src')
      }
    }, [photo.blob])
    return <img ref={ref} alt={alt} className="aspect-[4/3] w-full rounded-lg bg-slate-200 object-cover dark:bg-slate-800" />
  },
  (a, b) => a.photo.id === b.photo.id && a.alt === b.alt,
)

export function PhotosSection({ job }: { job: Job }) {
  const { addPhoto, deletePhoto } = useField()
  const photos = useLiveQuery(() => listPhotos(db, job.id), [job.id])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileId = useId()
  const editable = job.status === 'IN_PROGRESS'

  async function save(capture: Capture) {
    const result = await addPhoto({ jobId: job.id, blob: capture.blob, takenAt: capture.takenAt, fix: capture.fix })
    if (!result.ok) setMessage({ text: result.error, error: true })
    else setMessage({ text: capture.fix ? 'Photo saved with its time and location.' : `Photo saved with its time. ${capture.failure ? FAILURE_TEXT[capture.failure] : ''}`, error: false })
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const takenAt = new Date()
      const position = await readPosition()
      const blob = await stampFile(file, takenAt, position.ok ? position.fix : null)
      await save({ blob, takenAt, fix: position.ok ? position.fix : null, failure: position.ok ? null : position.reason })
    } catch {
      setMessage({ text: 'That file could not be read as a picture.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function onCapture(capture: Capture) {
    setCameraOpen(false)
    setMessage(null)
    await save(capture)
  }

  return (
    <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="photos-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="photos-heading" className="text-lg font-semibold">
          Photos
        </h2>
        <p className={`text-sm ${mutedText}`}>{photos?.length ?? 0} taken</p>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} onClick={() => setCameraOpen(true)} data-testid="open-camera">
            <Camera className="size-4" aria-hidden /> Take photo
          </button>
          <input id={fileId} type="file" accept="image/*" capture="environment" className="peer sr-only" onChange={(e) => void onFile(e)} data-testid="photo-file" disabled={busy} />
          <label htmlFor={fileId} className={`${secondaryButton} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-orange-600`}>
            <ImagePlus className="size-4" aria-hidden /> {busy ? 'Saving…' : 'Choose a photo'}
          </label>
        </div>
      )}
      {job.status === 'QUEUED' && <p className={`text-sm ${mutedText}`}>Start the job to take photos.</p>}
      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? errorText : mutedText}`} data-testid="photo-message">
          {message.text}
        </p>
      )}

      {photos && photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos for this job">
          {photos.map((photo) => {
            const when = formatDateTime(photo.takenAt)
            const located = photo.lat !== null && photo.lng !== null
            return (
              <li key={photo.id} className="space-y-1" data-testid="photo-item">
                <PhotoImage photo={photo} alt={`Photo taken ${when}`} />
                <p className="text-xs font-medium">{when}</p>
                {located ? (
                  <p className={`text-xs ${mutedText}`}>{formatFix({ lat: photo.lat ?? 0, lng: photo.lng ?? 0, accuracyM: photo.accuracyM })}</p>
                ) : (
                  <p className="flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                    <MapPinOff className="size-3.5" aria-hidden /> No location
                  </p>
                )}
                {editable && (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    aria-label={`Delete photo taken ${when}`}
                    onClick={() => void deletePhoto(photo.id)}
                  >
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {photos && photos.length === 0 && job.status !== 'QUEUED' && <p className={`text-sm ${mutedText}`}>No photos yet.</p>}

      {cameraOpen && <CameraDialog onCapture={(c) => void onCapture(c)} onClose={() => setCameraOpen(false)} />}
    </section>
  )
}
