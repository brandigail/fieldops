import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { primaryButton, secondaryButton } from '../../components/ui'
import { readPosition, type FixFailure } from '../../lib/geo'
import { stampImage, type Fix } from '../../lib/stamp'
import { cameraErrorMessage } from './cameraErrors'

export interface Capture {
  blob: Blob
  takenAt: Date
  fix: Fix | null
  failure: FixFailure | null
}

interface Props {
  onCapture: (capture: Capture) => void
  onClose: () => void
}

type CameraState = { kind: 'starting' } | { kind: 'ready' } | { kind: 'error'; message: string }

export function CameraDialog({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>({ kind: 'starting' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ kind: 'error', message: 'This browser cannot open the camera here (it needs a secure page). Choose a photo from your device instead.' })
        return
      }
      try {
        const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
        if (cancelled) {
          opened.getTracks().forEach((t) => t.stop())
          return
        }
        stream = opened
        const video = videoRef.current
        if (video) {
          video.srcObject = opened
          await video.play().catch(() => undefined)
        }
        setState({ kind: 'ready' })
        // Ask for the location now, so it is already warm when the shutter is pressed.
        void readPosition()
      } catch (error) {
        if (!cancelled) setState({ kind: 'error', message: cameraErrorMessage(error) })
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function shoot() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || busy) return
    setBusy(true)
    // The frame is grabbed the instant the button is pressed; finding the location may take a few seconds.
    const takenAt = new Date()
    const frame = document.createElement('canvas')
    frame.width = video.videoWidth
    frame.height = video.videoHeight
    frame.getContext('2d')?.drawImage(video, 0, 0)
    const position = await readPosition()
    try {
      const blob = await stampImage(frame, frame.width, frame.height, takenAt, position.ok ? position.fix : null)
      onCapture({ blob, takenAt, fix: position.ok ? position.fix : null, failure: position.ok ? null : position.reason })
    } catch {
      setState({ kind: 'error', message: 'The photo could not be saved. Try again.' })
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-3 dark:bg-slate-900">
        {state.kind === 'error' ? (
          <p role="alert" className="p-2 text-sm">
            {state.message}
          </p>
        ) : (
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-black object-cover" aria-label="Camera preview" />
        )}
        <div className="flex gap-2">
          {state.kind !== 'error' && (
            <button type="button" className={`${primaryButton} flex-1`} onClick={() => void shoot()} disabled={state.kind !== 'ready' || busy} data-testid="shutter">
              <Camera className="size-4" aria-hidden /> {busy ? 'Saving…' : state.kind === 'starting' ? 'Opening camera…' : 'Take photo'}
            </button>
          )}
          <button type="button" className={`${secondaryButton} ${state.kind === 'error' ? 'flex-1' : ''}`} onClick={onClose}>
            <X className="size-4" aria-hidden /> {state.kind === 'error' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
