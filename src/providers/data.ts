import { createContext, useContext } from 'react'
import type { NewPhoto, Result } from '../db/repo'
import type { Asset, CheckResult, ChecklistItem, Job, Photo, Report, Settings } from '../types'

export interface FieldData {
  /** False until the saved data has been read from this device. */
  ready: boolean
  /** True while the demo jobs are being added on the very first launch. */
  seeding: boolean
  /** The current time in milliseconds, refreshed every minute so "overdue" stays right. */
  now: number
  jobs: Job[]
  assets: Asset[]
  items: ChecklistItem[]
  reports: Report[]
  settings: Settings
  saveError: string | null

  startJob: (jobId: string) => Promise<Result<Job>>
  setResult: (itemId: string, result: CheckResult | null) => Promise<Result<ChecklistItem>>
  setNotes: (itemId: string, notes: string) => Promise<Result<ChecklistItem>>
  addPhoto: (input: NewPhoto) => Promise<Result<Photo>>
  deletePhoto: (photoId: string) => Promise<Result<true>>
  completeJob: (jobId: string, signaturePng: string, signedBy: string) => Promise<Result<Report>>
  saveSettings: (technician: string) => Promise<Result<Settings>>
  loadDemo: () => Promise<void>
  clearAll: () => Promise<void>
}

export const FieldDataContext = createContext<FieldData | null>(null)

export function useField(): FieldData {
  const ctx = useContext(FieldDataContext)
  if (!ctx) throw new Error('useField must be used within FieldDataProvider')
  return ctx
}
