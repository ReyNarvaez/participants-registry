// Page-level tests (ADR 002 › Testing): render the real App, stub only fetch, act like staff.
// They find things by role and label, so they keep passing while the code behind the page is restructured.
import { cleanup, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { Participant } from '@curebase/shared'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

type Request = { method: string; url: URL; body: unknown }
type Server = (request: Request) => Response

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
const listPage = ({ url }: Request, total: number) => {
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const items = Array.from({ length: Math.max(0, Math.min(20, total - offset)) }, (_, i) => participant(offset + i))
  return json(200, { items, total, limit: 20, offset })
}

let server: Server
const requests: Request[] = []

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
  render(<App />)

  await screen.findByText('Showing 1–20 of 45')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Showing 21–40 of 45')

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Participant saved. BMI: 22.86')
  await screen.findByText('Showing 1–20 of 46')
  expect(lastListQuery()).toEqual({ offset: '0' })
  expect(requests.find((r) => r.method === 'POST')?.body).not.toHaveProperty('bmi')
})

it('a duplicate email puts the message on the email field', async () => {
  server = (request) =>
    request.method === 'POST'
      ? json(409, { error: { code: 'EMAIL_TAKEN', message: 'A participant with this email already exists' } })
      : listPage(request, 0)
  const user = userEvent.setup()
  render(<App />)

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('A participant with this email already exists')
  expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByLabelText('Phone').getAttribute('aria-invalid')).toBe('false')
  screen.getByText('Could not save participant: check the highlighted fields')
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
            ],
          },
        })
      : listPage(request, 0)
  const user = userEvent.setup()
  render(<App />)

  await fillValidParticipant(user)
  await save(user)

  await screen.findByText('Server rejects this name')
  screen.getByText('Server rejects this phone')
  expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByLabelText('Phone').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('false')
})

it('applying a BMI range lists from page 1 and keeps the range while paging; Clear drops it', async () => {
  server = (request) => listPage(request, request.url.searchParams.has('minBmi') ? 25 : 45)
  const user = userEvent.setup()
  render(<App />)

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
})

it('Next and Previous request the neighbouring pages and stop at the ends', async () => {
  server = (request) => listPage(request, 45)
  const user = userEvent.setup()
  render(<App />)
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
