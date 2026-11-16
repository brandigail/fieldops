import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addPhoto, completeJob, deletePhoto, DEFAULT_SETTINGS, listAssets, listItems, listJobs, listReports, loadSettings, replaceAll, saveSettings, seedIfEmpty, setNotes, setResult, startJob, type Result } from '../db/repo'
import { db } from '../db/schema'
import { buildDemoWithMedia } from '../lib/demoMedia'
import { sortJobs } from '../lib/jobs'
import type { Asset, ChecklistItem, Job, Report } from '../types'
import { FieldDataContext, type FieldData } from './data'

const SEEDED_KEY = 'fieldops-seeded'
const SETTLE_MS = 2500
const MINUTE = 60_000
const NO_JOBS: Job[] = []
const NO_ASSETS: Asset[] = []
const NO_ITEMS: ChecklistItem[] = []
const NO_REPORTS: Report[] = []
const SAVE_FAILED = { ok: false, error: 'Your last change could not be saved on this device. Storage may be full.' } as const

// A flag records that the demo was added once, so deleting it later does not bring it back.
function wasSeeded(): boolean {
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    return false
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // ignore: worst case the demo is offered again on an empty database
  }
}

/**
 * Resolves once the page has fully loaded, a short grace period has passed and the browser is idle, so building the
 * demo pictures never competes with the app's own first load.
 */
async function whenIdle(): Promise<void> {
  if (document.readyState !== 'complete') await new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))
  await new Promise<void>((resolve) => window.setTimeout(resolve, SETTLE_MS))
  const requestIdle: ((callback: () => void, options?: { timeout: number }) => number) | undefined = window.requestIdleCallback?.bind(window)
  if (requestIdle) await new Promise<void>((resolve) => requestIdle(() => resolve(), { timeout: 2000 }))
}

/** Reads everything live from IndexedDB and exposes the actions the screens need, all going through the db layer. */
export function FieldDataProvider({ children }: { children: ReactNode }) {
  const [initialised, setInitialised] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const needsDemo = !wasSeeded() && (await db.jobs.count()) + (await db.reports.count()) === 0
        if (needsDemo && !cancelled) setSeeding(true)
        if (!cancelled) setInitialised(true)
        if (needsDemo) {
          await whenIdle()
          // Adds only if still empty: the technician may have done something while the demo was being prepared.
          await seedIfEmpty(db, await buildDemoWithMedia(Date.now()))
          markSeeded()
        }
      } catch {
        setSaveError('Your browser is blocking storage, so nothing can be saved on this device.')
        if (!cancelled) setInitialised(true)
      } finally {
        if (!cancelled) setSeeding(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // The clock behind "overdue" moves on every minute and when the app comes back to the front.
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, MINUTE)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const jobs = useLiveQuery(() => listJobs(db), [])
  const assets = useLiveQuery(() => listAssets(db), [])
  const items = useLiveQuery(() => listItems(db), [])
  const reports = useLiveQuery(() => listReports(db), [])
  const settings = useLiveQuery(() => loadSettings(db), [])

  const guard = useCallback(async <T,>(work: () => Promise<Result<T>>): Promise<Result<T>> => {
    try {
      const result = await work()
      setSaveError(null)
      return result
    } catch {
      setSaveError(SAVE_FAILED.error)
      return SAVE_FAILED
    }
  }, [])

  const guardVoid = useCallback(async (work: () => Promise<void>): Promise<void> => {
    try {
      await work()
      setSaveError(null)
    } catch {
      setSaveError(SAVE_FAILED.error)
    }
  }, [])

  const sorted = useMemo(() => (jobs ? sortJobs(jobs) : NO_JOBS), [jobs])

  const value = useMemo<FieldData>(
    () => ({
      ready: initialised && jobs !== undefined && assets !== undefined && items !== undefined && reports !== undefined && settings !== undefined,
      seeding,
      now,
      jobs: sorted,
      assets: assets ?? NO_ASSETS,
      items: items ?? NO_ITEMS,
      reports: reports ?? NO_REPORTS,
      settings: settings ?? DEFAULT_SETTINGS,
      saveError,
      startJob: (jobId) => guard(() => startJob(db, jobId)),
      setResult: (itemId, result) => guard(() => setResult(db, itemId, result)),
      setNotes: (itemId, notes) => guard(() => setNotes(db, itemId, notes)),
      addPhoto: (input) => guard(() => addPhoto(db, input)),
      deletePhoto: (photoId) => guard(() => deletePhoto(db, photoId)),
      completeJob: (jobId, signaturePng, signedBy) => guard(() => completeJob(db, jobId, signaturePng, signedBy)),
      saveSettings: (technician) => guard(() => saveSettings(db, technician)),
      loadDemo: () => guardVoid(async () => replaceAll(db, await buildDemoWithMedia(Date.now()))),
      clearAll: () => guardVoid(() => replaceAll(db, null)),
    }),
    [initialised, seeding, now, sorted, jobs, assets, items, reports, settings, saveError, guard, guardVoid],
  )

  return <FieldDataContext.Provider value={value}>{children}</FieldDataContext.Provider>
}
