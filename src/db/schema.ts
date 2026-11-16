import Dexie, { type Table } from 'dexie'
import type { Asset, ChecklistItem, Job, Photo, Report, Settings } from '../types'

/** Everything lives in IndexedDB on this device. All reading and writing goes through the functions in this folder. */
export class FieldOpsDb extends Dexie {
  assets!: Table<Asset, string>
  jobs!: Table<Job, string>
  items!: Table<ChecklistItem, string>
  photos!: Table<Photo, string>
  reports!: Table<Report, string>
  settings!: Table<Settings, string>

  constructor(name = 'fieldops') {
    super(name)
    this.version(1).stores({
      assets: 'id',
      jobs: 'id, status',
      items: 'id, jobId',
      photos: 'id, jobId',
      reports: 'id, jobId, synced',
      settings: 'id',
    })
  }
}

export const db = new FieldOpsDb()
