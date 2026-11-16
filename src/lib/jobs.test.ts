import { describe, expect, it } from 'vitest'
import type { CheckResult, ChecklistItem, Job } from '../types'
import { checklistProgress, completionBlockers, isOverdue, sortJobs } from './jobs'

const NOW = Date.parse('2026-11-16T10:00:00Z')

function job(id: string, over: Partial<Job>): Job {
  return { id, title: id, siteAddress: 'x', priority: 'MEDIUM', status: 'QUEUED', assetId: 'a', dueAt: '2026-11-16T12:00:00Z', startedAt: null, ...over }
}

function item(id: string, result: CheckResult | null, notes = ''): ChecklistItem {
  return { id, jobId: 'j', order: 0, label: id, result, notes }
}

describe('sortJobs', () => {
  it('puts the job under way first, then priority, then earliest due, then done jobs last', () => {
    const sorted = sortJobs([
      job('done-recent', { status: 'DONE', dueAt: '2026-11-15T10:00:00Z' }),
      job('low-early', { priority: 'LOW', dueAt: '2026-11-16T08:00:00Z' }),
      job('high-late', { priority: 'HIGH', dueAt: '2026-11-18T08:00:00Z' }),
      job('high-early', { priority: 'HIGH', dueAt: '2026-11-17T08:00:00Z' }),
      job('under-way', { status: 'IN_PROGRESS', priority: 'LOW' }),
      job('done-old', { status: 'DONE', dueAt: '2026-11-10T10:00:00Z' }),
    ]).map((j) => j.id)
    expect(sorted).toEqual(['under-way', 'high-early', 'high-late', 'low-early', 'done-recent', 'done-old'])
  })

  it('does not change the array it is given', () => {
    const input = [job('b', { priority: 'LOW' }), job('a', { priority: 'HIGH' })]
    sortJobs(input)
    expect(input.map((j) => j.id)).toEqual(['b', 'a'])
  })
})

describe('isOverdue', () => {
  it('is true only for unfinished jobs past their due time', () => {
    expect(isOverdue(job('a', { dueAt: '2026-11-16T09:59:00Z' }), NOW)).toBe(true)
    expect(isOverdue(job('b', { dueAt: '2026-11-16T10:01:00Z' }), NOW)).toBe(false)
    expect(isOverdue(job('c', { dueAt: '2026-11-01T10:00:00Z', status: 'DONE' }), NOW)).toBe(false)
    expect(isOverdue(job('d', { dueAt: '2026-11-01T10:00:00Z', status: 'IN_PROGRESS' }), NOW)).toBe(true)
  })
})

describe('checklistProgress', () => {
  it('counts answers, fails and fails that still need a note', () => {
    const p = checklistProgress([item('1', 'PASS'), item('2', 'FAIL', 'cracked'), item('3', 'FAIL', '   '), item('4', 'NA'), item('5', null)])
    expect(p).toEqual({ total: 5, answered: 4, passed: 1, failed: 2, failedWithoutNote: 1 })
  })
})

describe('completionBlockers', () => {
  it('is empty when everything is answered, failures are explained and photographed', () => {
    expect(completionBlockers([item('1', 'PASS'), item('2', 'FAIL', 'leak')], 1)).toEqual([])
    expect(completionBlockers([item('1', 'PASS'), item('2', 'NA')], 0)).toEqual([])
  })

  it('explains each reason in words', () => {
    const reasons = completionBlockers([item('1', null), item('2', null), item('3', 'FAIL', '')], 0)
    expect(reasons).toEqual(['2 checklist items are not answered.', '1 failed item needs a note saying what is wrong.', 'Add at least one photo of the problem.'])
  })

  it('uses the singular for one item and blocks a job with no checklist', () => {
    expect(completionBlockers([item('1', null)], 0)).toEqual(['1 checklist item is not answered.'])
    expect(completionBlockers([], 0)).toEqual(['This job has no checklist.'])
  })
})
