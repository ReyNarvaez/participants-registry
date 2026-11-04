// Page-level tests (ADR 002 › Testing): render the real App, stub only fetch, act like staff.
// They find things by role and label, so they keep passing while the code behind the page is restructured.
import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { Participant } from '@curebase/shared'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

type RecordedRequest = { method: string; url: URL; body: unknown }
type Server = (request: RecordedRequest) => Response | Promise<Response>

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const participant = (i: number): Participant => ({
  id: `p${i}`,
  name: `Participant ${i}`,
  email: `p${i}@example.com`,
  phone: `+1415555${String(i).padStart(4, '0')}`,
  dateOfBirth: '1990-01-01T00:00:00.000Z',
  weight: 70,
  weightUnit: 'kg',
  height: 175,
  heightUnit: 'cm',
  bmi: 22.86,
  createdAt: '2026-01-01T00:00:00.000Z',
})

/** A list endpoint over `total` participants, paged like the real one (limit 20). */
const listPage = ({ url }: RecordedRequest, total: number) => {
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const items = Array.from({ length: Math.max(0, Math.min(20, total - offset)) }, (_, i) => participant(offset + i))
  return json(200, { items, total, limit: 20, offset })
}

let server: Server
const requests: RecordedRequest[] = []

beforeEach(() => {
  requests.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const request = {
        method: init?.method ?? 'GET',
        url: new URL(input, 'http://localhost'),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      }
      requests.push(request)
      return server(request)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** The app as main.tsx mounts it, on a memory router built from the real routes, opened at `path`. */
function renderPage(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return router
}

/** True once a field shows as invalid; markup may leave a valid field's aria-invalid unset or 'false'. */
const isInvalid = (label: string) => screen.getByLabelText(label).getAttribute('aria-invalid') === 'true'

/** The query of every list request so far, e.g. [{ offset: '0' }, { offset: '20', minBmi: '18.5' }]. */
const listQueries = () =>
  requests
    .filter((r) => r.method === 'GET' && r.url.pathname === '/api/participants')
    .map((r) => Object.fromEntries(r.url.searchParams))
const lastListQuery = () => listQueries().at(-1)
/** Each different list query once (StrictMode runs effects twice in development, repeating a request). */
const distinctListQueries = () => [...new Set(listQueries().map((q) => JSON.stringify(q)))].map((q) => JSON.parse(q))

async function fillValidParticipant(user: UserEvent) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Phone'), '+14155552671')
  await user.type(screen.getByLabelText('Date of birth'), '1990-12-10')
  await user.type(screen.getByLabelText('Weight'), '70')
  await user.type(screen.getByLabelText('Height'), '175')
}

const save = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Save participant' }))

it('saving shows the computed BMI and reloads the list on page 1', async () => {
  let total = 45
  server = (request) => {
    if (request.method === 'POST') {
      total += 1
      return json(201, { ...participant(99), bmi: 22.86 })
    }
    return listPage(request, total)
  }
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Showing 21–40 of 45')

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Participant saved. BMI: 22.86')
  expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('') // the form clears for the next entry
  await screen.findByText('Showing 1–20 of 46')
  expect(lastListQuery()).toEqual({ offset: '0' })
  expect(requests.find((r) => r.method === 'POST')?.body).not.toHaveProperty('bmi')
})

it.each([
  ['EMAIL_TAKEN', 'A participant with this email already exists', 'Email', 'Phone'],
  ['PHONE_TAKEN', 'A participant with this phone number already exists', 'Phone', 'Email'],
])('a %s conflict puts its message on the matching field', async (code, message, field, otherField) => {
  server = (request) => (request.method === 'POST' ? json(409, { error: { code, message } }) : listPage(request, 0))
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText(message)
  expect(isInvalid(field)).toBe(true)
  expect(isInvalid(otherField)).toBe(false)
  screen.getByText('Could not save participant: check the highlighted fields')
})

it('an unusable BMI lands on weight and height, with the message from the shared catalog', async () => {
  // Code only: the page must not depend on the body's message.
  server = (request) => (request.method === 'POST' ? json(400, { error: { code: 'BMI_UNUSABLE' } }) : listPage(request, 0))
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user)
  await save(user)

  expect(await screen.findAllByText('Weight and height do not give a usable BMI')).toHaveLength(2)
  expect(isInvalid('Weight')).toBe(true)
  expect(isInvalid('Height')).toBe(true)
  expect(isInvalid('Email')).toBe(false)
})

it('validation details from the server land on their fields', async () => {
  server = (request) =>
    request.method === 'POST'
      ? json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some fields are invalid',
            details: [
              { field: 'name', message: 'Server rejects this name' },
              { field: 'phone', message: 'Server rejects this phone' },
              { field: 'bmi', message: 'Not a field on this form' },
              null, // malformed details are dropped, not fatal
            ],
          },
        })
      : listPage(request, 0)
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Server rejects this name')
  screen.getByText('Server rejects this phone')
  expect(isInvalid('Name')).toBe(true)
  expect(isInvalid('Phone')).toBe(true)
  expect(isInvalid('Email')).toBe(false)
  expect(screen.queryByText('Not a field on this form')).toBeNull() // details for fields the form lacks are dropped
})

it('applying a BMI range lists from page 1 and keeps the range while paging; Clear drops it', async () => {
  server = (request) => listPage(request, request.url.searchParams.has('minBmi') ? 25 : 45)
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Showing 21–40 of 45')

  await user.type(screen.getByLabelText('Min BMI'), '18.5')
  await user.type(screen.getByLabelText('Max BMI'), '25')
  await user.click(screen.getByRole('button', { name: 'Apply' }))
  await screen.findByText('Showing 1–20 of 25')
  expect(lastListQuery()).toEqual({ offset: '0', minBmi: '18.5', maxBmi: '25' })

  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Showing 21–25 of 25')
  expect(lastListQuery()).toEqual({ offset: '20', minBmi: '18.5', maxBmi: '25' })

  await user.click(screen.getByRole('button', { name: 'Clear' }))
  await screen.findByText('Showing 1–20 of 45')
  expect(lastListQuery()).toEqual({ offset: '0' })
  expect(screen.getByLabelText<HTMLInputElement>('Min BMI').value).toBe('')
  expect(screen.getByLabelText<HTMLInputElement>('Max BMI').value).toBe('')
})

it('Next and Previous request the neighbouring pages and stop at the ends', async () => {
  server = (request) => listPage(request, 45)
  const user = userEvent.setup()
  renderPage()
  const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name })

  await screen.findByText('Showing 1–20 of 45')
  expect(button('Previous').disabled).toBe(true)

  await user.click(button('Next'))
  await screen.findByText('Showing 21–40 of 45')
  await user.click(button('Next'))
  await screen.findByText('Showing 41–45 of 45')
  expect(lastListQuery()).toEqual({ offset: '40' })
  expect(button('Next').disabled).toBe(true)

  await user.click(button('Previous'))
  await screen.findByText('Showing 21–40 of 45')
  expect(lastListQuery()).toEqual({ offset: '20' })
})

it('says when the list is empty, and whether a BMI range caused it', async () => {
  server = (request) => listPage(request, 0)
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('No participants yet.')
  await user.type(screen.getByLabelText('Min BMI'), '40')
  await user.click(screen.getByRole('button', { name: 'Apply' }))
  await screen.findByText('No participants match this BMI range.')
})

it('says the list could not load when the server fails', async () => {
  server = () => json(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } })
  renderPage()

  await screen.findByText(/^Could not load participants/)
})

it.each([
  ['no response', () => Promise.reject(new TypeError('Failed to fetch'))],
  ['a response without the shared error body', () => new Response('<html>Bad gateway</html>', { status: 502 })],
])('a save that gets %s fails with a form-level message', async (_, failedSave) => {
  vi.mocked(fetch).mockImplementation(async (input, init) =>
    init?.method === 'POST' ? failedSave() : listPage({ method: 'GET', url: new URL(String(input), 'http://localhost'), body: undefined }, 0),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText(/^Could not save participant \(/)
  expect(isInvalid('Email')).toBe(false)
})

it('a shared link opens that page of that BMI range, with the range in the inputs', async () => {
  server = (request) => listPage(request, request.url.searchParams.has('minBmi') ? 25 : 45)
  renderPage('/participants?offset=20&minBmi=18.5&maxBmi=25')

  await screen.findByText('Showing 21–25 of 25')
  expect(distinctListQueries()).toEqual([{ offset: '20', minBmi: '18.5', maxBmi: '25' }])
  expect(screen.getByLabelText<HTMLInputElement>('Min BMI').value).toBe('18.5')
  expect(screen.getByLabelText<HTMLInputElement>('Max BMI').value).toBe('25')
})

it('Back returns to the page of the list shown before', async () => {
  server = (request) => listPage(request, 45)
  const user = userEvent.setup()
  const router = renderPage()

  await screen.findByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Showing 21–40 of 45')
  await act(() => router.navigate(-1))
  await screen.findByText('Showing 1–20 of 45')
})

it.each([
  ['/participants?offset=abc&minBmi=1e1&maxBmi=25', { offset: '0', maxBmi: '25' }, '?maxBmi=25'],
  ['/participants?minBmi=30&maxBmi=20', { offset: '0' }, ''],
  ['/participants?offset=20&offset=40', { offset: '0' }, ''],
])('never requests the invalid params in %s, and drops them from the URL', async (path, query, search) => {
  server = (request) => listPage(request, 45)
  const router = renderPage(path)

  await screen.findByText('Showing 1–20 of 45')
  expect(distinctListQueries()).toEqual([query])
  expect(router.state.location.search).toBe(search)
})

it('a stale link past the last page shows page 1', async () => {
  server = (request) => listPage(request, 45)
  const router = renderPage('/participants?offset=500')

  await screen.findByText('Showing 1–20 of 45')
  expect(router.state.location.search).toBe('')
})

it('opens the participants page at / and a not-found page anywhere else', async () => {
  server = (request) => listPage(request, 0)
  const router = renderPage('/')
  await screen.findByText('No participants yet.')
  expect(router.state.location.pathname).toBe('/participants')

  cleanup()
  const shared = renderPage('/?minBmi=25') // a shared link to / keeps its range
  await screen.findByText('No participants match this BMI range.')
  expect(shared.state.location).toMatchObject({ pathname: '/participants', search: '?minBmi=25' })

  cleanup()
  renderPage('/nope')
  screen.getByRole('heading', { name: 'Page not found' })
})

it('a save while on page 1 re-fetches the page in place', async () => {
  let total = 3
  server = (request) => {
    if (request.method !== 'POST') return listPage(request, total)
    total += 1
    return json(201, participant(99))
  }
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–3 of 3')
  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Showing 1–4 of 4')
})

it('a save keeps BMI filter text that was typed but not yet applied', async () => {
  server = (request) => (request.method === 'POST' ? json(201, participant(99)) : listPage(request, 3))
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–3 of 3')
  await user.type(screen.getByLabelText('Max BMI'), '30')
  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Participant saved. BMI: 22.86')
  expect(screen.getByLabelText<HTMLInputElement>('Max BMI').value).toBe('30')
})

it('while a page loads, its rows stay under a spinner and the list controls wait', async () => {
  let release = () => {}
  server = (request) =>
    request.url.searchParams.get('offset') === '20'
      ? new Promise((resolve) => (release = () => resolve(listPage(request, 45))))
      : listPage(request, 45)
  const user = userEvent.setup()
  renderPage()
  const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name })
  const list = () => screen.getByRole('region', { name: 'Participants' })

  await screen.findByText('Showing 1–20 of 45')
  expect(list().getAttribute('aria-busy')).toBe('false')
  await user.click(button('Next'))

  await waitFor(() => expect(list().getAttribute('aria-busy')).toBe('true'))
  screen.getByText('Showing 1–20 of 45') // the previous page stays on screen
  screen.getByRole('status', { name: 'Loading participants' })
  for (const name of ['Previous', 'Next', 'Apply', 'Clear']) expect(button(name).disabled).toBe(true)

  release()
  await screen.findByText('Showing 21–40 of 45')
  expect(list().getAttribute('aria-busy')).toBe('false')
  expect(button('Next').disabled).toBe(false)
  expect(screen.queryByRole('status', { name: 'Loading participants' })).toBeNull()
})

it('a page that fails to load keeps the rows shown before, so staff can go back', async () => {
  server = (request) =>
    request.url.searchParams.get('offset') === '20'
      ? json(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } })
      : listPage(request, 45)
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await screen.findByText('Could not load participants (Something went wrong)')
  screen.getByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Previous' }))
  await waitFor(() => expect(screen.queryByText(/^Could not load participants/)).toBeNull())
  expect(lastListQuery()).toEqual({ offset: '0' })
})

it('the re-fetch after a save does not hold the list controls', async () => {
  let total = 3
  let release = () => {}
  server = (request) => {
    if (request.method === 'POST') {
      total += 1
      return json(201, participant(99))
    }
    if (total === 3) return listPage(request, total)
    return new Promise((resolve) => (release = () => resolve(listPage(request, total))))
  }
  const user = userEvent.setup()
  renderPage()

  await screen.findByText('Showing 1–3 of 3')
  await fillValidParticipant(user)
  await save(user)
  await screen.findByText('Participant saved. BMI: 22.86')

  // The page shown is still the one asked for, so nothing is covered or held while it refreshes.
  expect(screen.getByRole('region', { name: 'Participants' }).getAttribute('aria-busy')).toBe('false')
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Apply' }).disabled).toBe(false)
  release()
  await screen.findByText('Showing 1–4 of 4')
})

/** The text that describes an input for assistive tech (its aria-describedby), or '' when nothing does. */
const description = (label: string) =>
  (screen.getByLabelText(label).getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')

it('a height typed in the wrong unit is flagged until the unit is fixed, as advice only', async () => {
  server = (request) => listPage(request, 0)
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user) // 70 kg, 175 cm: typical, so no warning
  await user.selectOptions(screen.getByLabelText('Height unit'), 'in') // 175 in is 4.4 m

  const warning = await screen.findByText('Unusual height: check the unit')
  expect(warning.closest('[aria-live="polite"]')).not.toBeNull()
  expect(description('Height')).toBe('Unusual height: check the unit')
  expect(isInvalid('Height')).toBe(false)

  await user.selectOptions(screen.getByLabelText('Height unit'), 'cm')
  await waitFor(() => expect(screen.queryByText('Unusual height: check the unit')).toBeNull())
  expect(description('Height')).toBe('')
})

it('an unusual weight is saved anyway, once staff are sure', async () => {
  server = (request) => (request.method === 'POST' ? json(201, { ...participant(99), bmi: 97.96 }) : listPage(request, 0))
  const user = userEvent.setup()
  renderPage()

  await fillValidParticipant(user)
  await user.clear(screen.getByLabelText('Weight'))
  await user.type(screen.getByLabelText('Weight'), '300') // kg, above the typical range
  await user.tab() // leaving the field checks it
  await screen.findByText('Unusual weight: check the unit')

  await save(user)
  await screen.findByText('Participant saved. BMI: 97.96')
  expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({ weight: 300, weightUnit: 'kg' })
  expect(screen.queryByText('Unusual weight: check the unit')).toBeNull() // the cleared form has nothing to flag
})

it('does not flag a number while it is still being typed', async () => {
  server = (request) => listPage(request, 0)
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText('Weight'), '7') // on its way to 70
  expect(screen.queryByText('Unusual weight: check the unit')).toBeNull()
})
