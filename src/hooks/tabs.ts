import type { Route } from './useRoute'

export type TabId = 'jobs' | 'reports' | 'settings'

export const TABS: readonly { to: TabId; label: string }[] = [
  { to: 'jobs', label: 'Jobs' },
  { to: 'reports', label: 'Reports' },
  { to: 'settings', label: 'Settings' },
]

/** Which tab a screen belongs to: a job's detail counts as part of Jobs. */
export function activeTab(route: Route): TabId {
  return route.name === 'job' ? 'jobs' : route.name
}
