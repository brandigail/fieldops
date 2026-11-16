import type { Demo } from '../lib/demo'
import { completionBlockers } from '../lib/jobs'
import type { Fix } from '../lib/stamp'
import type { Asset, CheckResult, ChecklistItem, Job, Photo, Report, Settings } from '../types'
import type { FieldOpsDb } from './schema'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

const RESULTS: readonly CheckResult[] = ['PASS', 'FAIL', 'NA']
const MAX_NOTE = 500
const MAX_NAME = 80
const MAX_PHOTO_BYTES = 4_000_000
const MAX_PHOTOS_PER_JOB = 20
const PNG_PREFIX = 'data:image/png;base64,'
const MAX_SIGNATURE_CHARS = 400_000

export const DEFAULT_SETTINGS: Settings = { id: 'settings', technician: 'Field technician' }

// ---------- Reading ----------

export const listJobs = (database: FieldOpsDb): Promise<Job[]> => database.jobs.toArray()
export const listAssets = (database: FieldOpsDb): Promise<Asset[]> => database.assets.toArray()
export const listItems = (database: FieldOpsDb): Promise<ChecklistItem[]> => database.items.toArray()
export const listReports = (database: FieldOpsDb): Promise<Report[]> => database.reports.toArray()

/** The photos of one job, oldest first. */
export async function listPhotos(database: FieldOpsDb, jobId: string): Promise<Photo[]> {
  return (await database.photos.where('jobId').equals(jobId).toArray()).sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt))
}

export async function jobItems(database: FieldOpsDb, jobId: string): Promise<ChecklistItem[]> {
  return (await database.items.where('jobId').equals(jobId).toArray()).sort((a, b) => a.order - b.order)
}

// ---------- Working a job ----------

export async function startJob(database: FieldOpsDb, jobId: string, now = new Date()): Promise<Result<Job>> {
  return database.transaction('rw', database.jobs, async () => {
    const job = await database.jobs.get(jobId)
    if (!job) return fail('That job no longer exists.')
    if (job.status === 'DONE') return fail('This job is already signed off.')
    if (job.status === 'IN_PROGRESS') return { ok: true, value: job }
    const started: Job = { ...job, status: 'IN_PROGRESS', startedAt: now.toISOString() }
    await database.jobs.put(started)
    return { ok: true, value: started }
  })
}

/** Gives the working copy of an item, or the reason it cannot be changed. Items can only change while the job is under way. */
async function editableItem(database: FieldOpsDb, itemId: string): Promise<Result<ChecklistItem>> {
  const item = await database.items.get(itemId)
  if (!item) return fail('That checklist item no longer exists.')
  const job = await database.jobs.get(item.jobId)
  if (!job) return fail('That job no longer exists.')
  if (job.status === 'DONE') return fail('This job is signed off, so the checklist is locked.')
  if (job.status === 'QUEUED') return fail('Start the job before filling in its checklist.')
  return { ok: true, value: item }
}

/** Sets an answer. Choosing the answer that is already set clears it again, so a slip is easy to undo. */
export async function setResult(database: FieldOpsDb, itemId: string, result: CheckResult | null): Promise<Result<ChecklistItem>> {
  if (result !== null && !RESULTS.includes(result)) return fail('Choose pass, fail or not applicable.')
  return database.transaction('rw', [database.items, database.jobs], async () => {
    const found = await editableItem(database, itemId)
    if (!found.ok) return found
    const next: ChecklistItem = { ...found.value, result: found.value.result === result ? null : result }
    await database.items.put(next)
    return { ok: true, value: next }
  })
}

export async function setNotes(database: FieldOpsDb, itemId: string, notes: string): Promise<Result<ChecklistItem>> {
  if (notes.length > MAX_NOTE) return fail(`Keep notes under ${MAX_NOTE} characters.`)
  return database.transaction('rw', [database.items, database.jobs], async () => {
    const found = await editableItem(database, itemId)
    if (!found.ok) return found
    const next: ChecklistItem = { ...found.value, notes }
    await database.items.put(next)
    return { ok: true, value: next }
  })
}

export interface NewPhoto {
  jobId: string
  blob: Blob
  takenAt: Date
  fix: Fix | null
}

export async function addPhoto(database: FieldOpsDb, input: NewPhoto): Promise<Result<Photo>> {
  if (!input.blob.type.startsWith('image/')) return fail('That file is not a picture.')
  if (input.blob.size === 0 || input.blob.size > MAX_PHOTO_BYTES) return fail('That picture is empty or too large to keep.')
  return database.transaction('rw', [database.photos, database.jobs], async () => {
    const job = await database.jobs.get(input.jobId)
    if (!job) return fail('That job no longer exists.')
    if (job.status !== 'IN_PROGRESS') return fail(job.status === 'DONE' ? 'This job is signed off, so photos are locked.' : 'Start the job before taking photos.')
    if ((await database.photos.where('jobId').equals(input.jobId).count()) >= MAX_PHOTOS_PER_JOB) return fail(`A job can hold ${MAX_PHOTOS_PER_JOB} photos.`)
    const photo: Photo = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      blob: input.blob,
      takenAt: input.takenAt.toISOString(),
      lat: input.fix?.lat ?? null,
      lng: input.fix?.lng ?? null,
      accuracyM: input.fix?.accuracyM ?? null,
    }
    await database.photos.add(photo)
    return { ok: true, value: photo }
  })
}

export async function deletePhoto(database: FieldOpsDb, photoId: string): Promise<Result<true>> {
  return database.transaction('rw', [database.photos, database.jobs], async () => {
    const photo = await database.photos.get(photoId)
    if (!photo) return { ok: true as const, value: true as const }
    const job = await database.jobs.get(photo.jobId)
    if (job?.status === 'DONE') return fail('This job is signed off, so photos are locked.')
    await database.photos.delete(photoId)
    return { ok: true as const, value: true as const }
  })
}

/**
 * Signs a job off: checks it is really finished, stores the report (marked as not yet synced) and marks the job done,
 * all in one transaction so a job can never be "done" without a report or the other way round.
 */
export async function completeJob(database: FieldOpsDb, jobId: string, signaturePng: string, signedBy: string, now = new Date()): Promise<Result<Report>> {
  const name = signedBy.replace(/\s+/g, ' ').trim()
  if (name === '') return fail('Type the name of the person signing.')
  if (name.length > MAX_NAME) return fail(`Keep the name under ${MAX_NAME} characters.`)
  if (!signaturePng.startsWith(PNG_PREFIX) || signaturePng.length > MAX_SIGNATURE_CHARS) return fail('The signature could not be read. Clear it and sign again.')
  return database.transaction('rw', [database.jobs, database.items, database.photos, database.reports, database.settings], async () => {
    const job = await database.jobs.get(jobId)
    if (!job) return fail('That job no longer exists.')
    if (job.status === 'DONE') return fail('This job is already signed off.')
    if (job.status === 'QUEUED') return fail('Start the job before signing it off.')
    const items = await database.items.where('jobId').equals(jobId).toArray()
    const blockers = completionBlockers(items, await database.photos.where('jobId').equals(jobId).count())
    if (blockers.length > 0) return fail(blockers[0] ?? 'The job is not finished yet.')
    const technician = (await database.settings.get('settings'))?.technician ?? DEFAULT_SETTINGS.technician
    const report: Report = { id: crypto.randomUUID(), jobId, signaturePng, signedBy: name, technician, completedAt: now.toISOString(), synced: false }
    await database.reports.put(report)
    await database.jobs.put({ ...job, status: 'DONE' })
    return { ok: true, value: report }
  })
}

// ---------- Settings ----------

export async function loadSettings(database: FieldOpsDb): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await database.settings.get('settings')) }
}

export async function saveSettings(database: FieldOpsDb, technician: string): Promise<Result<Settings>> {
  const name = technician.replace(/\s+/g, ' ').trim()
  if (name === '') return fail('Enter your name so it can go on reports.')
  if (name.length > MAX_NAME) return fail(`Keep the name under ${MAX_NAME} characters.`)
  const settings: Settings = { id: 'settings', technician: name }
  await database.settings.put(settings)
  return { ok: true, value: settings }
}

// ---------- Demo data ----------

export interface DemoWithPhotos extends Demo {
  photos: Photo[]
}

const ALL_TABLES = (d: FieldOpsDb) => [d.assets, d.jobs, d.items, d.photos, d.reports]

/**
 * Adds the demo jobs only if the database is completely empty, checked and written in one transaction. The demo is
 * prepared in the background after the first screen, so by the time it is ready the technician may already have
 * started a job: this must never overwrite or remove anything. Returns whether it added the demo.
 */
export async function seedIfEmpty(database: FieldOpsDb, demo: DemoWithPhotos): Promise<boolean> {
  return database.transaction('rw', ALL_TABLES(database), async () => {
    if ((await database.jobs.count()) + (await database.reports.count()) > 0) return false
    await writeDemo(database, demo)
    return true
  })
}

/** Swaps everything for the demo (or for nothing) in one transaction. Only for the explicit buttons in Settings. */
export async function replaceAll(database: FieldOpsDb, demo: DemoWithPhotos | null): Promise<void> {
  await database.transaction('rw', ALL_TABLES(database), async () => {
    await Promise.all(ALL_TABLES(database).map((table) => table.clear()))
    if (demo) await writeDemo(database, demo)
  })
}

async function writeDemo(database: FieldOpsDb, demo: DemoWithPhotos): Promise<void> {
  await database.assets.bulkPut(demo.assets)
  await database.jobs.bulkPut(demo.jobs)
  await database.items.bulkPut(demo.items)
  await database.photos.bulkPut(demo.photos)
  await database.reports.bulkPut(demo.reports)
}
