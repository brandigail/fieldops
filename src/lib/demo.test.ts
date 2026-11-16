import { describe, expect, it } from 'vitest'
import { buildDemo } from './demo'
import { completionBlockers, isOverdue } from './jobs'

const NOW = Date.parse('2026-11-16T10:00:00Z')
const SIG = 'data:image/png;base64,AAAA'

describe('buildDemo', () => {
  const demo = buildDemo(NOW, SIG)

  it('has eight jobs, each with its own asset and a checklist', () => {
    expect(demo.jobs).toHaveLength(8)
    expect(demo.assets).toHaveLength(8)
    for (const job of demo.jobs) {
      expect(demo.assets.some((a) => a.id === job.assetId)).toBe(true)
      expect(demo.items.filter((i) => i.jobId === job.id).length).toBeGreaterThan(0)
    }
  })

  it('has a spread of statuses with one job under way, one overdue and two done', () => {
    expect(demo.jobs.filter((j) => j.status === 'IN_PROGRESS')).toHaveLength(1)
    expect(demo.jobs.filter((j) => j.status === 'DONE')).toHaveLength(2)
    expect(demo.jobs.filter((j) => isOverdue(j, NOW))).toHaveLength(1)
  })

  it('only started jobs have a start time', () => {
    for (const job of demo.jobs) expect(job.startedAt === null).toBe(job.status === 'QUEUED')
  })

  it('gives each finished job a report that was not synced and a complete checklist', () => {
    const done = demo.jobs.filter((j) => j.status === 'DONE')
    expect(demo.reports.map((r) => r.jobId).sort()).toEqual(done.map((j) => j.id).sort())
    expect(demo.reports.every((r) => !r.synced && r.signaturePng === SIG)).toBe(true)
    for (const job of done) {
      const items = demo.items.filter((i) => i.jobId === job.id)
      expect(completionBlockers(items, 1)).toEqual([])
    }
  })

  it('leaves the job under way part-way through, with a failed item that has a note', () => {
    const items = demo.items.filter((i) => i.jobId === 'job-1')
    expect(items.some((i) => i.result === null)).toBe(true)
    expect(items.find((i) => i.result === 'FAIL')?.notes).not.toBe('')
  })

  it('has unique ids and is the same every time', () => {
    const ids = [...demo.jobs, ...demo.assets, ...demo.items, ...demo.reports].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(buildDemo(NOW, SIG)).toEqual(demo)
  })
})
