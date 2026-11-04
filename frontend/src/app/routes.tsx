import { Navigate, type RouteObject } from 'react-router'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ParticipantsPage } from '../pages/ParticipantsPage'
import { AppLayout } from './AppLayout'

/** The app's routes, shared by the browser router (App) and the memory router the tests build. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/participants" replace /> },
      { path: '/participants', element: <ParticipantsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
