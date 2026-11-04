import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createParticipantSchema,
  type CreateParticipant,
  type CreateParticipantInput,
} from '@curebase/shared'

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
    formState: { errors, isSubmitting },
  } = useForm<CreateParticipantInput, unknown, CreateParticipant>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: { weightUnit: 'kg', heightUnit: 'cm' },
  })
  const [result, setResult] = useState<string>()

  async function onSubmit(participant: CreateParticipant) {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    })
    // ponytail: server errors show as one status line; mapping them onto fields is a later ticket.
    if (!res.ok) return setResult(`Could not save participant (HTTP ${res.status})`)
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
            {...register('weight', { valueAsNumber: true })}
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
            {...register('height', { valueAsNumber: true })}
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
