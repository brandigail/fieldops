import { lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { mutedText } from './components/ui'
import { JobsPage } from './features/jobs/JobsPage'
import { useRoute } from './hooks/useRoute'
import { useField } from './providers/data'

// Everything except the queue loads on demand, which keeps the first load small.
const JobPage = lazy(() => import('./features/jobs/JobPage').then((m) => ({ default: m.JobPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

export function App() {
  const { ready, saveError } = useField()
  const [route, go] = useRoute()

  return (
    <div className="min-h-dvh bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <UpdatePrompt />
      <Header route={route} onGo={go} />
      {saveError && (
        <p role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          {saveError}
        </p>
      )}
      <main className="mx-auto max-w-4xl px-4 pt-4 pb-28 md:pb-10">
        {!ready ? (
          <p className={mutedText}>Loading…</p>
        ) : (
          <Suspense fallback={<p className={mutedText}>Loading…</p>}>
            {route.name === 'jobs' && <JobsPage onGo={go} />}
            {route.name === 'job' && <JobPage id={route.id} onGo={go} />}
            {route.name === 'reports' && <ReportsPage onGo={go} />}
            {route.name === 'settings' && <SettingsPage />}
          </Suspense>
        )}
      </main>
      <TabBar route={route} onGo={go} />
    </div>
  )
}
