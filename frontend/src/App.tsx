import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AppError,
  appError,
  createParticipantSchema,
  listParticipantsQuerySchema,
  type CreateParticipant,
  type CreateParticipantInput,
  type ListParticipantsQueryInput,
  type ParticipantList as ParticipantListResponse,
} from '@curebase/shared'

type FormField = keyof CreateParticipantInput

/** The form inputs a server error belongs on (its catalog fields or its details); fields the form lacks are dropped. */
function fieldErrors(error: AppError): [FormField, string][] {
  return error
    .fieldErrors()
    .filter((detail) => Object.hasOwn(createParticipantSchema.shape, detail.field))
    .map((detail) => [detail.field as FormField, detail.message])
}

/** A failed response as the AppError it carries; UNAVAILABLE when it has no shared body (e.g. a proxy error page). */
async function readError(res: Response): Promise<AppError> {
  return AppError.fromResponse(await res.json().catch(() => null))
}

/** Anything thrown while fetching that isn't a server's AppError means no usable response arrived. */
const asAppError = (error: unknown) => (error instanceof AppError ? error : appError.unavailable())

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

/** The raw input strings, sent as typed once the shared schema accepts them. */
type BmiRange = Pick<ListParticipantsQueryInput, 'minBmi' | 'maxBmi'>

/** Min/max BMI inputs, validated with the list query schema, applied on submit rather than per keystroke. */
function BmiFilter({ onApply }: { onApply: (range: BmiRange) => void }) {
  // raw: submit hands over the validated strings as typed, sent as is since String(1e-7) is '1e-7', which the server rejects.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListParticipantsQueryInput>({ resolver: zodResolver(listParticipantsQuerySchema, undefined, { raw: true }) })
  // An empty input is no bound; the query schema itself rejects '' (an empty query param).
  const bound = { setValueAs: (value: string) => (value === '' ? undefined : value) }
  const apply = handleSubmit(({ minBmi, maxBmi }) => onApply({ minBmi, maxBmi }))

  return (
    <form aria-label="BMI filter" onSubmit={apply} noValidate>
      <Field label="Min BMI" error={errors.minBmi?.message}>
        <input type="text" inputMode="decimal" {...register('minBmi', bound)} aria-invalid={!!errors.minBmi} />
      </Field>
      <Field label="Max BMI" error={errors.maxBmi?.message}>
        <input type="text" inputMode="decimal" {...register('maxBmi', bound)} aria-invalid={!!errors.maxBmi} />
      </Field>
      <button type="submit">Apply</button>{' '}
      <button
        type="button"
        onClick={() => {
          reset()
          onApply({})
        }}
      >
        Clear
      </button>
    </form>
  )
}

type ParticipantListProps = { offset: number; range: BmiRange; reload: number; onPage: (offset: number) => void }

/**
 * Newest first, one page at a time. `offset` is the requested page; the rows shown stay until it arrives.
 * Bumping `reload` re-fetches in place.
 */
function ParticipantList({ offset, range: { minBmi, maxBmi }, reload, onPage }: ParticipantListProps) {
  // `filtered` records the range that produced this page, so the empty message matches the rows on screen.
  const [list, setList] = useState<ParticipantListResponse & { filtered: boolean }>()
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    let current = true // ignore a response that lands after a newer request
    const query = new URLSearchParams({ offset: String(offset) })
    if (minBmi !== undefined) query.set('minBmi', minBmi)
    if (maxBmi !== undefined) query.set('maxBmi', maxBmi)
    fetch(`/api/participants?${query}`)
      .then(async (res) => {
        if (!res.ok) throw await readError(res)
        return (await res.json()) as ParticipantListResponse
      })
      .then((page) => {
        if (!current) return
        setList({ ...page, filtered: minBmi !== undefined || maxBmi !== undefined })
        setLoadError(undefined)
      })
      .catch((error: unknown) => {
        if (current) setLoadError(`Could not load participants (${asAppError(error).message})`)
      })
    return () => {
      current = false
    }
  }, [offset, minBmi, maxBmi, reload])

  const status = loadError ?? (list ? '' : 'Loading participants…')
  return (
    <section aria-labelledby="participants-heading">
      <h2 id="participants-heading">Participants</h2>
      {status && <p role="status">{status}</p>}
      {list &&
        (list.total === 0 ? (
          <p>{list.filtered ? 'No participants match this BMI range.' : 'No participants yet.'}</p>
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
  const [bmiRange, setBmiRange] = useState<BmiRange>({})
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
      return setResult(`Could not save participant (${appError.unavailable().message})`)
    }
    if (!res.ok) {
      const error = await readError(res)
      const serverErrors = fieldErrors(error)
      for (const [field, fieldMessage] of serverErrors) setError(field, { message: fieldMessage })
      return setResult(
        serverErrors.length ? 'Could not save participant: check the highlighted fields' : `Could not save participant (${error.message})`,
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
      <BmiFilter
        onApply={(range) => {
          setBmiRange(range)
          setListOffset(0)
        }}
      />
      <ParticipantList offset={listOffset} range={bmiRange} reload={listReload} onPage={setListOffset} />
    </main>
  )
}

export default App
