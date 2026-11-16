import type { Fix } from './stamp'

export type FixFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported'
export type FixResult = { ok: true; fix: Fix } | { ok: false; reason: FixFailure }

/** The `code` of a GeolocationPositionError: 1 permission denied, 2 position unavailable, 3 timed out. */
export function failureFromCode(code: number): FixFailure {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

export const FAILURE_TEXT: Record<FixFailure, string> = {
  denied: 'Location permission was blocked, so this photo has no coordinates.',
  unavailable: 'The phone could not work out where it is, so this photo has no coordinates.',
  timeout: 'Finding the location took too long, so this photo has no coordinates.',
  unsupported: 'This browser cannot share a location, so this photo has no coordinates.',
}

/**
 * Asks for the current position. A fix up to 30 seconds old is fine for a site photo, and the wait is capped so a
 * missing signal never leaves the technician staring at a spinner. Never rejects: the caller always gets a result.
 */
export function readPosition(timeoutMs = 8000): Promise<FixResult> {
  const geolocation: Geolocation | undefined = typeof navigator === 'undefined' ? undefined : navigator.geolocation
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') return Promise.resolve({ ok: false, reason: 'unsupported' })
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve({ ok: false, reason: 'unavailable' })
          return
        }
        resolve({ ok: true, fix: { lat: latitude, lng: longitude, accuracyM: Number.isFinite(accuracy) ? accuracy : null } })
      },
      (error) => resolve({ ok: false, reason: failureFromCode(error.code) }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    )
  })
}
