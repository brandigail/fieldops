import { Moon, Sun, Wrench } from 'lucide-react'
import type { Destination, Route } from '../hooks/useRoute'
import { activeTab, TABS } from '../hooks/tabs'
import { useField } from '../providers/data'
import { useTheme } from '../providers/theme'
import { iconButton } from './ui'

interface Props {
  route: Route
  onGo: (to: Destination) => void
}

export function Header({ route, onGo }: Props) {
  const { theme, toggleTheme } = useTheme()
  const { jobs } = useField()
  const current = activeTab(route)
  const underWay = jobs.find((j) => j.status === 'IN_PROGRESS')

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        <button type="button" className="flex min-h-11 items-center gap-2 text-lg font-bold" onClick={() => onGo('jobs')} aria-label="FieldOps, go to Jobs">
          <img src="/favicon.svg" alt="" width={28} height={28} className="size-7 rounded-md" />
          <span>FieldOps</span>
        </button>
        <nav aria-label="Main" className="ml-4 hidden flex-1 gap-1 md:flex">
          {TABS.map((t) => (
            <button
              key={t.to}
              type="button"
              aria-current={current === t.to ? 'page' : undefined}
              onClick={() => onGo(t.to)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
                current === t.to ? 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {underWay && (
          <button
            type="button"
            onClick={() => onGo({ job: underWay.id })}
            className="ml-auto flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-orange-50 px-3 text-sm font-semibold text-orange-900 md:ml-0 dark:bg-orange-950 dark:text-orange-100"
            data-testid="active-pill"
          >
            <Wrench className="size-4 shrink-0" aria-hidden />
            <span className="max-w-32 truncate sm:max-w-56">{underWay.title}</span>
          </button>
        )}
        <button type="button" className={`${iconButton} ${underWay ? '' : 'ml-auto'}`} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  )
}
