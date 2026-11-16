import { useCallback, useMemo, useSyncExternalStore } from 'react'

export type Route = { name: 'jobs' } | { name: 'reports' } | { name: 'settings' } | { name: 'job'; id: string }

export type Destination = 'jobs' | 'reports' | 'settings' | { job: string }

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const read = () => window.location.hash

export function parseRoute(hash: string): Route {
  const detail = /^#\/job\/([A-Za-z0-9-]{1,64})$/.exec(hash)
  if (detail?.[1]) return { name: 'job', id: detail[1] }
  const page = hash.replace(/^#\/?/, '')
  return page === 'reports' || page === 'settings' ? { name: page } : { name: 'jobs' }
}

export function hashFor(to: Destination): string {
  return typeof to === 'string' ? `/${to}` : `/job/${to.job}`
}

/** The current screen, kept in the URL hash so the back button, a refresh and a shared link all behave. */
export function useRoute(): [Route, (to: Destination) => void] {
  const hash = useSyncExternalStore(subscribe, read, () => '')
  const route = useMemo(() => parseRoute(hash), [hash])
  const go = useCallback((to: Destination) => {
    window.location.hash = hashFor(to)
    window.scrollTo({ top: 0 })
  }, [])
  return [route, go]
}
