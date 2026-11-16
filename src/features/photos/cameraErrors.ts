/** Words for the reasons a camera can fail to open, so the technician knows what to do next. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was blocked. Allow the camera for this site in the browser settings, or choose a photo from your device instead.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device. Choose a photo from your device instead.'
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app. Close it and try again, or choose a photo from your device.'
  return 'The camera could not be opened. Choose a photo from your device instead.'
}
