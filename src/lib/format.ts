const DAY_MS = 86_400_000

function startOfDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** "Overdue by 2 h", "Today 14:00", "Tomorrow 09:00" or "Fri 20 Nov, 11:00". `now` is passed in so it is easy to test. */
export function formatDue(dueAt: string, now: number, done = false): string {
  const due = Date.parse(dueAt)
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS)
  if (!done && due < now) {
    const hours = Math.round((now - due) / 3_600_000)
    if (hours < 1) return 'Overdue by under an hour'
    if (hours < 24) return `Overdue by ${hours} h`
    const overdueDays = Math.floor(hours / 24)
    return `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`
  }
  if (days === 0) return `Today ${clock(due)}`
  if (days === 1) return `Tomorrow ${clock(due)}`
  if (days === -1) return `Yesterday ${clock(due)}`
  const date = new Date(due).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  return `${date}, ${clock(due)}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} ${clock(d.getTime())}`
}

/** A file-name-safe version of a title: "Generator service, Block B" becomes "generator-service-block-b". */
export function slug(text: string): string {
  const out = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return out === '' ? 'report' : out
}

/** The built-in PDF fonts only cover Latin-1. Anything else would print as garbage, so it becomes "?". */
export function toPdfText(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63
    if (ch === '\n' || ch === '\t' || (code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += ch
    else out += '?'
  }
  return out
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the file.')))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(blob)
  })
}
