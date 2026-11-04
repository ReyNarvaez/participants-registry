// Page-level tests (ADR 002 › Testing): render the real App, stub only fetch, act like staff.
// They find things by role and label, so they keep passing while the code behind the page is restructured.
import { StrictMode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { Participant } from '@curebase/shared'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

type RecordedRequest = { method: string; url: URL; body: unknown }
type Server = (request: RecordedRequest) => Response

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

/** The page as main.tsx mounts it. The one place to add providers (router, query client) as the app grows. */
const renderPage = () => render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/** True once a field shows as invalid; markup may leave a valid field's aria-invalid unset or 'false'. */
const isInvalid = (label: string) => screen.getByLabelText(label).getAttribute('aria-invalid') === 'true'

/** The query of the latest list request, e.g. { offset: '20', minBmi: '18.5' }. */
const lastListQuery = () => {
  const list = requests.filter((r) => r.method === 'GET' && r.url.pathname === '/api/participants')
  return Object.fromEntries(list.at(-1)!.url.searchParams)
}

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
