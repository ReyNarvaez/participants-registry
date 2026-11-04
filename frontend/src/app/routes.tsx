import { Navigate, useLocation, type RouteObject } from 'react-router'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ParticipantsPage } from '../pages/ParticipantsPage'
import { AppLayout } from './AppLayout'

/** `/` opens the participants page, keeping any query (e.g. a shared `/?minBmi=25`). */
function ToParticipants() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/participants', search }} replace />
}

/** The app's routes, shared by the browser router (App) and the memory router the tests build. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ToParticipants /> },
      { path: '/participants', element: <ParticipantsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
