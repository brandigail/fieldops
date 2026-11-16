import type { Asset, CheckResult, ChecklistItem, Job, JobStatus, Priority, Report } from '../types'

const HOUR = 3_600_000

type Answer = [CheckResult, string] | null

interface Template {
  type: string
  items: string[]
}

const TEMPLATES: Record<string, Template> = {
  generator: {
    type: 'Backup generator',
    items: ['Engine oil level between the marks', 'Coolant level and hoses', 'Battery terminals clean and tight', 'Fuel tank above 50%', 'Transfer switch test', 'Exhaust and ventilation clear', 'Run on load for 10 minutes'],
  },
  lift: {
    type: 'Passenger lift',
    items: ['Door sensors stop the doors', 'Emergency phone connects', 'Cab lighting works', 'Car levels with the floor', 'Inspection certificate displayed'],
  },
  alarm: {
    type: 'Fire alarm panel',
    items: ['Panel shows normal, no faults', 'One detector tested per zone', 'Standby battery voltage in range', 'Sounders audible in every area', 'Log book updated'],
  },
  hvac: {
    type: 'Rooftop air handler',
    items: ['Filters clean or replaced', 'Condensate drain clear', 'Belt tension and wear', 'Refrigerant pressures in range', 'Thermostat reads within 1 degree'],
  },
  extinguisher: {
    type: 'Fire extinguishers',
    items: ['Gauge in the green', 'Safety pin and seal intact', 'Hose and nozzle undamaged', 'Bracket secure', 'Service tag in date', 'Access clear, sign visible'],
  },
  board: {
    type: 'Distribution board',
    items: ['Circuit labels legible', 'Thermal scan shows no hot spots', 'Lug torque checked', 'Earth leakage trip test', 'All covers fitted'],
  },
  pump: {
    type: 'Booster pump set',
    items: ['No leaks at the seals', 'Normal noise and vibration', 'Outlet pressure in range', 'Isolation valves move freely'],
  },
  lighting: {
    type: 'Emergency lighting',
    items: ['Test button works', 'Battery holds for 30 minutes', 'Every lamp lights', 'Exit signs visible'],
  },
}

interface Spec {
  key: keyof typeof TEMPLATES
  assetName: string
  location: string
  title: string
  site: string
  priority: Priority
  status: JobStatus
  /** Hours from now the job is due (negative is in the past). */
  dueInHours: number
  answers: Answer[]
}

const SPECS: Spec[] = [
  {
    key: 'generator', assetName: 'Generator G-2', location: 'Plant room, basement level 2', title: 'Quarterly service: backup generator', site: 'Northgate Plaza, 14 Main Road', priority: 'HIGH', status: 'IN_PROGRESS', dueInHours: 3,
    answers: [['PASS', ''], ['PASS', ''], ['FAIL', 'Positive terminal corroded. Cleaned, needs a new clamp.'], ['PASS', ''], null, null, null],
  },
  { key: 'lift', assetName: 'Lift B2', location: 'North core, ground to level 9', title: 'Lift inspection: door and levelling fault', site: 'Harbour Heights, 2 Dock Street', priority: 'HIGH', status: 'QUEUED', dueInHours: -2, answers: [] },
  { key: 'alarm', assetName: 'Fire panel FP-1', location: 'Security office, ground floor', title: 'Fire alarm panel test', site: 'Northgate Plaza, 14 Main Road', priority: 'HIGH', status: 'QUEUED', dueInHours: 20, answers: [] },
  { key: 'hvac', assetName: 'Air handler RTU-3', location: 'Roof, east side', title: 'Rooftop air handler: filters and belts', site: 'Kestrel Business Park, Unit 7', priority: 'MEDIUM', status: 'QUEUED', dueInHours: 26, answers: [] },
  { key: 'extinguisher', assetName: 'Extinguishers, level 4', location: 'Level 4 corridors and kitchen', title: 'Annual extinguisher check, level 4', site: 'Harbour Heights, 2 Dock Street', priority: 'MEDIUM', status: 'QUEUED', dueInHours: 50, answers: [] },
  { key: 'board', assetName: 'Board DB-12', location: 'Electrical riser, level 3', title: 'Distribution board thermal scan', site: 'Kestrel Business Park, Unit 7', priority: 'LOW', status: 'QUEUED', dueInHours: 76, answers: [] },
  {
    key: 'pump', assetName: 'Booster set BP-1', location: 'Pump room, ground floor', title: 'Booster pump set service', site: 'Northgate Plaza, 14 Main Road', priority: 'MEDIUM', status: 'DONE', dueInHours: -26,
    answers: [['PASS', ''], ['PASS', ''], ['PASS', ''], ['PASS', '']],
  },
  {
    key: 'lighting', assetName: 'Emergency lights, stairwell A', location: 'Stairwell A, all floors', title: 'Emergency lighting test, stairwell A', site: 'Harbour Heights, 2 Dock Street', priority: 'LOW', status: 'DONE', dueInHours: -50,
    answers: [['PASS', ''], ['FAIL', 'Level 6 unit lasted only 12 minutes. Battery replacement ordered.'], ['PASS', ''], ['PASS', '']],
  },
]

export interface Demo {
  assets: Asset[]
  jobs: Job[]
  items: ChecklistItem[]
  reports: Report[]
}

/** The demo queue: eight jobs around the given moment, so it always has something overdue, due soon and done. */
export function buildDemo(now: number, signaturePng: string): Demo {
  const assets: Asset[] = []
  const jobs: Job[] = []
  const items: ChecklistItem[] = []
  const reports: Report[] = []

  SPECS.forEach((spec, index) => {
    const n = index + 1
    const template = TEMPLATES[spec.key]
    if (!template) throw new Error(`Missing template ${spec.key}`)
    const assetId = `asset-${n}`
    const jobId = `job-${n}`
    const dueMs = now + spec.dueInHours * HOUR
    assets.push({ id: assetId, name: spec.assetName, type: template.type, location: spec.location })
    jobs.push({
      id: jobId,
      title: spec.title,
      siteAddress: spec.site,
      priority: spec.priority,
      status: spec.status,
      assetId,
      dueAt: new Date(dueMs).toISOString(),
      startedAt: spec.status === 'QUEUED' ? null : new Date(spec.status === 'IN_PROGRESS' ? now - 1.5 * HOUR : dueMs - 2 * HOUR).toISOString(),
    })
    template.items.forEach((label, i) => {
      const answer = spec.answers[i] ?? null
      items.push({ id: `${jobId}-item-${i + 1}`, jobId, order: i, label, result: answer ? answer[0] : null, notes: answer ? answer[1] : '' })
    })
    if (spec.status === 'DONE') {
      reports.push({ id: `report-${n}`, jobId, signaturePng, signedBy: 'Site manager', technician: 'Sam Dube', completedAt: new Date(dueMs - 30 * 60_000).toISOString(), synced: false })
    }
  })
  return { assets, jobs, items, reports }
}
