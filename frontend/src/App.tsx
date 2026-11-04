import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createParticipantSchema,
  type CreateParticipant,
  type CreateParticipantInput,
  type ErrorCode,
  type ErrorResponse,
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

type FieldProps = { label: string; error?: string; children: ReactNode; unit?: ReactNode }

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
      const body = (await res.json().catch(() => null)) as ErrorResponse | null
      const serverErrors = body?.error ? fieldErrors(body.error) : []
      for (const [field, message] of serverErrors) setError(field, { message })
      return setResult(
        serverErrors.length
          ? 'Could not save participant: check the highlighted fields'
          : `Could not save participant (${body?.error?.message ?? `HTTP ${res.status}`})`,
      )
    }
    const { bmi } = (await res.json()) as { bmi: number }
    setResult(`Participant saved. BMI: ${bmi}`)
    reset()
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
    </main>
  )
}

export default App
