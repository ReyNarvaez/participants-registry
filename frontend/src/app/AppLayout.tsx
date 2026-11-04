import { Activity } from 'lucide-react'
import { Outlet } from 'react-router'

/** The frame around every page. App-wide providers go here, so the real routes carry them in tests too. */
export function AppLayout() {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Activity className="size-5 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-lg font-semibold tracking-tight">Participant Registry</h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
