import { Outlet } from 'react-router'

/** The frame around every page. App-wide providers go here, so the real routes carry them in tests too. */
export function AppLayout() {
  return (
    <main>
      <h1>Participant Registry</h1>
      <Outlet />
    </main>
  )
}
