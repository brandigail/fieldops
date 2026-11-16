const MAX_SIDE = 1280
const JPEG_QUALITY = 0.82

export interface Fix {
  lat: number
  lng: number
  accuracyM: number | null
}

/** "26.20410° S, 28.04730° E (±12 m)" or a plain statement that there is no location. */
export function formatFix(fix: Fix | null): string {
  if (fix === null) return 'Location not available'
  const ns = fix.lat >= 0 ? 'N' : 'S'
  const ew = fix.lng >= 0 ? 'E' : 'W'
  const accuracy = fix.accuracyM === null ? '' : ` (±${Math.round(fix.accuracyM)} m)`
  return `${Math.abs(fix.lat).toFixed(5)}° ${ns}, ${Math.abs(fix.lng).toFixed(5)}° ${ew}${accuracy}`
}

/** The two lines burned into the corner of every photo. */
export function stampLines(takenAt: Date, fix: Fix | null): [string, string] {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${takenAt.getFullYear()}-${pad(takenAt.getMonth() + 1)}-${pad(takenAt.getDate())} ${pad(takenAt.getHours())}:${pad(takenAt.getMinutes())}:${pad(takenAt.getSeconds())}`
  return [stamp, formatFix(fix)]
}

/** Shrinks a size so its longest side is at most `max`, keeping the proportions. Never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo.'))), 'image/jpeg', JPEG_QUALITY)
  })
}

/** Draws a frame (a video element or a decoded image) to a canvas, burns the time and place in, and encodes a JPEG. */
export async function stampImage(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, takenAt: Date, fix: Fix | null): Promise<Blob> {
  const size = fitWithin(sourceWidth, sourceHeight)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare the photo.')
  ctx.drawImage(source, 0, 0, size.width, size.height)

  const lines = stampLines(takenAt, fix)
  const fontSize = Math.max(14, Math.round(size.width / 48))
  const pad = Math.round(fontSize * 0.6)
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`
  ctx.textBaseline = 'top'
  const boxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + pad * 2
  const boxHeight = fontSize * 2 + pad * 2 + Math.round(fontSize * 0.2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, size.height - boxHeight, boxWidth, boxHeight)
  ctx.fillStyle = fix === null ? '#fdba74' : '#ffffff'
  lines.forEach((line, i) => ctx.fillText(line, pad, size.height - boxHeight + pad + i * (fontSize + Math.round(fontSize * 0.2))))
  return canvasToJpeg(canvas)
}

/** Loads a picked image file (the fallback when the camera cannot be opened) and stamps it. */
export async function stampFile(file: File, takenAt: Date, fix: Fix | null): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    return await stampImage(bitmap, bitmap.width, bitmap.height, takenAt, fix)
  } finally {
    bitmap.close()
  }
}
