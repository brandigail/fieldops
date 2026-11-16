import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDemo } from '../lib/demo'
import type { Photo } from '../types'
import { addPhoto, completeJob, deletePhoto, jobItems, listJobs, listPhotos, listReports, loadSettings, replaceAll, saveSettings, seedIfEmpty, setNotes, setResult, startJob, type DemoWithPhotos } from './repo'
import { FieldOpsDb } from './schema'

const NOW = Date.parse('2026-11-16T10:00:00Z')
const SIG = 'data:image/png;base64,iVBORw0KGgo='

function demo(): DemoWithPhotos {
  return { ...buildDemo(NOW, SIG), photos: [] }
}

function jpeg(bytes = 2000): Blob {
  return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
}

let database: FieldOpsDb
let counter = 0

beforeEach(async () => {
  database = new FieldOpsDb(`test-${counter++}`)
  await seedIfEmpty(database, demo())
})

/** Answers every item of a job as PASS. */
async function passAll(jobId: string): Promise<void> {
  for (const item of await jobItems(database, jobId)) {
    if (item.result !== 'PASS') {
      await setResult(database, item.id, item.result === null ? 'PASS' : null)
      if (item.result !== null) await setResult(database, item.id, 'PASS')
    }
  }
}

describe('seeding', () => {
  it('adds the demo once and never over existing data', async () => {
    expect(await database.jobs.count()).toBe(8)
    expect(await seedIfEmpty(database, demo())).toBe(false)
    expect(await database.jobs.count()).toBe(8)
  })

  it('does not touch a job the technician already started, even when the seed arrives late and races', async () => {
    const fresh = new FieldOpsDb(`race-${counter++}`)
    const results = await Promise.all([seedIfEmpty(fresh, demo()), seedIfEmpty(fresh, demo()), seedIfEmpty(fresh, demo())])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await fresh.jobs.count()).toBe(8)
    await startJob(fresh, 'job-2')
    expect(await seedIfEmpty(fresh, demo())).toBe(false)
    expect((await fresh.jobs.get('job-2'))?.status).toBe('IN_PROGRESS')
  })

  it('replaceAll swaps everything in one go and can empty the app', async () => {
    await replaceAll(database, null)
    expect(await database.jobs.count()).toBe(0)
    expect(await database.items.count()).toBe(0)
    await replaceAll(database, demo())
    expect(await database.jobs.count()).toBe(8)
  })
})

describe('starting a job', () => {
  it('moves a queued job to in progress with a start time', async () => {
    const started = await startJob(database, 'job-2', new Date('2026-11-16T10:30:00Z'))
    expect(started).toMatchObject({ ok: true, value: { status: 'IN_PROGRESS', startedAt: '2026-11-16T10:30:00.000Z' } })
  })

  it('keeps the original start time if started again, and refuses finished or missing jobs', async () => {
    const first = await startJob(database, 'job-1')
    expect(first.ok && first.value.startedAt).toBe(buildDemo(NOW, SIG).jobs[0]?.startedAt)
    expect(await startJob(database, 'job-7')).toMatchObject({ ok: false })
    expect(await startJob(database, 'nope')).toMatchObject({ ok: false })
  })
})

describe('checklist', () => {
  it('records an answer and clears it when chosen again', async () => {
    const [item] = await jobItems(database, 'job-1')
    const empty = (await jobItems(database, 'job-1')).find((i) => i.result === null)
    expect(item).toBeDefined()
    expect(empty).toBeDefined()
    const id = empty?.id ?? ''
    expect(await setResult(database, id, 'PASS')).toMatchObject({ ok: true, value: { result: 'PASS' } })
    expect(await setResult(database, id, 'FAIL')).toMatchObject({ ok: true, value: { result: 'FAIL' } })
    expect(await setResult(database, id, 'FAIL')).toMatchObject({ ok: true, value: { result: null } })
  })

  it('refuses answers before the job is started and after it is signed off', async () => {
    expect(await setResult(database, 'job-2-item-1', 'PASS')).toMatchObject({ ok: false })
    expect(await setNotes(database, 'job-2-item-1', 'hi')).toMatchObject({ ok: false })
    expect(await setResult(database, 'job-7-item-1', 'FAIL')).toMatchObject({ ok: false })
    expect(await setResult(database, 'missing', 'PASS')).toMatchObject({ ok: false })
  })

  it('refuses an unknown answer and over-long notes', async () => {
    expect(await setResult(database, 'job-1-item-5', 'MAYBE' as never)).toMatchObject({ ok: false })
    expect(await setNotes(database, 'job-1-item-5', 'x'.repeat(501))).toMatchObject({ ok: false })
    expect(await setNotes(database, 'job-1-item-5', 'fine')).toMatchObject({ ok: true, value: { notes: 'fine' } })
  })

  it('returns items in checklist order', async () => {
    const items = await jobItems(database, 'job-1')
    expect(items.map((i) => i.order)).toEqual([...items.map((i) => i.order)].sort((a, b) => a - b))
  })
})

describe('photos', () => {
  it('stores a photo with its time and place, and keeps a missing place as null', async () => {
    const withFix = await addPhoto(database, { jobId: 'job-1', blob: jpeg(), takenAt: new Date('2026-11-16T10:00:00Z'), fix: { lat: -26.2, lng: 28.04, accuracyM: 8 } })
    const without = await addPhoto(database, { jobId: 'job-1', blob: jpeg(), takenAt: new Date('2026-11-16T10:05:00Z'), fix: null })
    expect(withFix.ok && withFix.value).toMatchObject({ lat: -26.2, lng: 28.04, accuracyM: 8 })
    expect(without.ok && without.value).toMatchObject({ lat: null, lng: null, accuracyM: null })
    expect((await listPhotos(database, 'job-1')).map((p: Photo) => p.takenAt)).toEqual(['2026-11-16T10:00:00.000Z', '2026-11-16T10:05:00.000Z'])
  })

  it('refuses non-images, empty and huge files, queued and finished jobs, and too many photos', async () => {
    const base = { takenAt: new Date(), fix: null }
    expect(await addPhoto(database, { ...base, jobId: 'job-1', blob: new Blob(['x'], { type: 'text/plain' }) })).toMatchObject({ ok: false })
    expect(await addPhoto(database, { ...base, jobId: 'job-1', blob: jpeg(0) })).toMatchObject({ ok: false })
    expect(await addPhoto(database, { ...base, jobId: 'job-1', blob: jpeg(4_000_001) })).toMatchObject({ ok: false })
    expect(await addPhoto(database, { ...base, jobId: 'job-2', blob: jpeg() })).toMatchObject({ ok: false })
    expect(await addPhoto(database, { ...base, jobId: 'job-7', blob: jpeg() })).toMatchObject({ ok: false })
    expect(await addPhoto(database, { ...base, jobId: 'missing', blob: jpeg() })).toMatchObject({ ok: false })
    for (let i = 0; i < 20; i += 1) await addPhoto(database, { ...base, jobId: 'job-1', blob: jpeg() })
    expect(await addPhoto(database, { ...base, jobId: 'job-1', blob: jpeg() })).toMatchObject({ ok: false })
  })

  it('deletes a photo while the job is open but not once it is signed off', async () => {
    const added = await addPhoto(database, { jobId: 'job-1', blob: jpeg(), takenAt: new Date(), fix: null })
    const id = added.ok ? added.value.id : ''
    expect(await deletePhoto(database, id)).toMatchObject({ ok: true })
    expect(await listPhotos(database, 'job-1')).toHaveLength(0)
    await database.photos.put({ id: 'locked', jobId: 'job-7', blob: jpeg(), takenAt: new Date().toISOString(), lat: null, lng: null, accuracyM: null })
    expect(await deletePhoto(database, 'locked')).toMatchObject({ ok: false })
    expect(await database.photos.count()).toBe(1)
  })
})

describe('signing off', () => {
  it('refuses while the checklist is incomplete and gives the reason', async () => {
    const result = await completeJob(database, 'job-1', SIG, 'Site manager')
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('not answered') })
    expect((await database.jobs.get('job-1'))?.status).toBe('IN_PROGRESS')
  })

  it('refuses a failed item with no photo, then accepts once there is one', async () => {
    await startJob(database, 'job-3')
    await passAll('job-3')
    const items = await jobItems(database, 'job-3')
    await setResult(database, items[0]?.id ?? '', null)
    await setResult(database, items[0]?.id ?? '', 'FAIL')
    expect(await completeJob(database, 'job-3', SIG, 'Pat')).toMatchObject({ ok: false, error: expect.stringContaining('note') })
    await setNotes(database, items[0]?.id ?? '', 'Panel fault light on')
    expect(await completeJob(database, 'job-3', SIG, 'Pat')).toMatchObject({ ok: false, error: expect.stringContaining('photo') })
    await addPhoto(database, { jobId: 'job-3', blob: jpeg(), takenAt: new Date(), fix: null })
    expect(await completeJob(database, 'job-3', SIG, 'Pat')).toMatchObject({ ok: true })
  })

  it('creates one unsynced report and marks the job done', async () => {
    await startJob(database, 'job-5')
    await passAll('job-5')
    await saveSettings(database, 'Sam Dube')
    const result = await completeJob(database, 'job-5', SIG, '  Site   manager ', new Date('2026-11-16T12:00:00Z'))
    expect(result).toMatchObject({ ok: true, value: { jobId: 'job-5', signedBy: 'Site manager', technician: 'Sam Dube', completedAt: '2026-11-16T12:00:00.000Z', synced: false } })
    expect((await database.jobs.get('job-5'))?.status).toBe('DONE')
    expect((await listReports(database)).filter((r) => r.jobId === 'job-5')).toHaveLength(1)
    expect(await completeJob(database, 'job-5', SIG, 'Again')).toMatchObject({ ok: false })
  })

  it('validates the signer and the signature, and needs the job to be started', async () => {
    await startJob(database, 'job-6')
    await passAll('job-6')
    expect(await completeJob(database, 'job-6', SIG, '   ')).toMatchObject({ ok: false })
    expect(await completeJob(database, 'job-6', SIG, 'x'.repeat(81))).toMatchObject({ ok: false })
    expect(await completeJob(database, 'job-6', 'not-a-png', 'Pat')).toMatchObject({ ok: false })
    expect(await completeJob(database, 'job-6', `data:image/png;base64,${'A'.repeat(400_000)}`, 'Pat')).toMatchObject({ ok: false })
    expect(await completeJob(database, 'job-4', SIG, 'Pat')).toMatchObject({ ok: false })
    expect(await completeJob(database, 'missing', SIG, 'Pat')).toMatchObject({ ok: false })
    expect((await database.jobs.get('job-6'))?.status).toBe('IN_PROGRESS')
    expect(await database.reports.count()).toBe(2)
  })

  it('keeps jobs listed after sign-off', async () => {
    expect((await listJobs(database)).filter((j) => j.status === 'DONE')).toHaveLength(2)
  })
})

describe('settings', () => {
  it('has a default name, saves a cleaned one and refuses empty or long names', async () => {
    expect((await loadSettings(database)).technician).toBe('Field technician')
    expect(await saveSettings(database, '  Sam   Dube ')).toMatchObject({ ok: true, value: { technician: 'Sam Dube' } })
    expect((await loadSettings(database)).technician).toBe('Sam Dube')
    expect(await saveSettings(database, ' ')).toMatchObject({ ok: false })
    expect(await saveSettings(database, 'x'.repeat(81))).toMatchObject({ ok: false })
  })
})
