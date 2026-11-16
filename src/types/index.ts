export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE'
export type CheckResult = 'PASS' | 'FAIL' | 'NA'

export interface Asset {
  id: string
  name: string
  type: string
  location: string
}

export interface Job {
  id: string
  title: string
  siteAddress: string
  priority: Priority
  status: JobStatus
  assetId: string
  /** ISO timestamp. */
  dueAt: string
  /** ISO timestamp, set when the technician starts the job. */
  startedAt: string | null
}

export interface ChecklistItem {
  id: string
  jobId: string
  /** Position in the checklist. */
  order: number
  label: string
  result: CheckResult | null
  notes: string
}

/** Where a photo was taken. `null` coordinates mean the location was denied, unavailable or timed out. */
export interface Photo {
  id: string
  jobId: string
  /** The JPEG with the time and place stamped on it. */
  blob: Blob
  takenAt: string
  lat: number | null
  lng: number | null
  /** Metres, when the phone reported it. */
  accuracyM: number | null
}

export interface Report {
  id: string
  jobId: string
  /** The signature as a PNG data URL. */
  signaturePng: string
  signedBy: string
  /** The technician's name when the job was signed off. */
  technician: string
  completedAt: string
  /** False until the (Phase 2) sync function confirms the report reached the server. */
  synced: boolean
}

export interface Settings {
  id: 'settings'
  technician: string
}
