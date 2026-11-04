import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createParticipantSchema,
  type CreateParticipant,
  type CreateParticipantInput,
  type ErrorCode,
  type ErrorResponse,
  type ParticipantList as ParticipantListResponse,
} from '@curebase/shared'

type FormField = keyof CreateParticipantInput

const takenField: Partial<Record<ErrorCode, FormField>> = { EMAIL_TAKEN: 'email', PHONE_TAKEN: 'phone' }

/** The form inputs a server error belongs on: the 409s on email/phone, validation details on their field. */
function fieldErrors({ code, message, details = [] }: ErrorResponse['error']): [FormField, string][] {
  const field = takenField[code]
  if (field) return [[field, message]]
  return details
    .filter((detail) => Object.hasOwn(createParticipantSchema.shape, detail.field))
    .map((detail) => [detail.field as FormField, detail.message])
}

/** A failed response's message, plus its shared error body when it has one (a proxy error page has none). */
async function readError(res: Response): Promise<{ message: string; error?: ErrorResponse['error'] }> {
  const body = (await res.json().catch(() => null)) as ErrorResponse | null
  return { message: body?.error?.message ?? `HTTP ${res.status}`, error: body?.error }
}

type FieldProps ={ label: string; error?: string; children: ReactNode; unit?: ReactNode }

function Field({ label, error, children, unit }: FieldProps) {
  return (
    <p>
      <label>
        {label} {children}
      </label>
      {unit}
      {error && <span role="alert"> {error}</span>}
    </p>
  )
}

type ParticipantListProps = { offset: number; reload: number; onPage: (offset: number) => void }

/**
 * Newest first, one page at a time. `offset` is the requested page; the rows shown stay until it arrives.
 * Bumping `reload` re-fetches in place.
 */
function ParticipantList({ offset, reload, onPage }: ParticipantListProps) {
  const [list, setList] = useState<ParticipantListResponse>()
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    let current = true // ignore a response that lands after a newer request
    fetch(`/api/participants?offset=${offset}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await readError(res)).message)
        return (await res.json()) as ParticipantListResponse
      })
      .then((page) => {
        if (!current) return
        setList(page)
        setLoadError(undefined)
      })
      .catch((error: unknown) => {
        if (current) setLoadError(`Could not load participants (${error instanceof Error ? error.message : error})`)
      })
    return () => {
      current = false
    }
  }, [offset, reload])

  const status = loadError ?? (list ? '' : 'Loading participants…')
  return (
    <section aria-labelledby="participants-heading">
      <h2 id="participants-heading">Participants</h2>
      {status && <p role="status">{status}</p>}
      {list &&
        (list.total === 0 ? (
          <p>No participants yet.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Date of birth</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Height</th>
                  <th scope="col">BMI</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td>{p.dateOfBirth.slice(0, 10)}</td>
                    <td>
                      {p.weight} {p.weightUnit}
                    </td>
                    <td>
                      {p.height} {p.heightUnit}
                    </td>
                    <td>{p.bmi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Showing {list.offset + 1}–{list.offset + list.items.length} of {list.total}
            </p>
            {/* From the requested offset, not the page shown, so a quick second click isn't lost. */}
            <button type="button" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - list.limit))}>
              Previous
            </button>{' '}
            <button type="button" disabled={offset + list.limit >= list.total} onClick={() => onPage(offset + list.limit)}>
              Next
            </button>
          </>
        ))}
    </section>
  )
}

function App() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateParticipantInput, unknown, CreateParticipant>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: { weightUnit: 'kg', heightUnit: 'cm' },
  })
  const [result, setResult] = useState<string>()
  const [listOffset, setListOffset] = useState(0)
  const [listReload, setListReload] = useState(0)

  async function onSubmit(participant: CreateParticipant) {
    let res: Response
    try {
      res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      })
    } catch {
      return setResult('Could not save participant (no response from server)')
    }
    if (!res.ok) {
      const { message, error } = await readError(res)
      const serverErrors = error ? fieldErrors(error) : []
      for (const [field, fieldMessage] of serverErrors) setError(field, { message: fieldMessage })
      return setResult(
        serverErrors.length ? 'Could not save participant: check the highlighted fields' : `Could not save participant (${message})`,
      )
    }
    const { bmi } = (await res.json()) as { bmi: number }
    setResult(`Participant saved. BMI: ${bmi}`)
    reset()
    // The newest participant is on the first page; the reload bump re-fetches even when already on it.
    setListOffset(0)
    setListReload((n) => n + 1)
  }

  return (
    <main>
      <h1>Participant Registry</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Name" error={errors.name?.message}>
          <input {...register('name')} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" {...register('email')} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input type="tel" placeholder="+14155552671" {...register('phone')} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Date of birth" error={errors.dateOfBirth?.message}>
          <input type="date" {...register('dateOfBirth')} aria-invalid={!!errors.dateOfBirth} />
        </Field>
        <Field
          label="Weight"
          error={errors.weight?.message}
          unit={
            <select aria-label="Weight unit" {...register('weightUnit')}>
              {createParticipantSchema.shape.weightUnit.options.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          }
        >
          <input
            type="number"
            step="any"
            {...register('weight', { valueAsNumber: true, deps: ['height'] })}
            aria-invalid={!!errors.weight}
          />
        </Field>
        <Field
          label="Height"
          error={errors.height?.message}
          unit={
            <select aria-label="Height unit" {...register('heightUnit')}>
              {createParticipantSchema.shape.heightUnit.options.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          }
        >
          <input
            type="number"
            step="any"
            {...register('height', { valueAsNumber: true, deps: ['weight'] })}
            aria-invalid={!!errors.height}
          />
        </Field>
        <button type="submit" disabled={isSubmitting}>
          Save participant
        </button>
      </form>
      {result && <p role="status">{result}</p>}
      <ParticipantList offset={listOffset} reload={listReload} onPage={setListOffset} />
    </main>
  )
}

export default App
