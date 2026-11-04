import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppError, createParticipantSchema, type CreateParticipant, type CreateParticipantInput } from '@curebase/shared'
import { Field } from '../../../components/Field'
import { setServerErrors } from '../../../lib/form-errors'
import { createParticipant } from '../api'
import { useListParams } from '../list-params'

const formFields = Object.keys(createParticipantSchema.shape)

/** Creates a participant and shows the BMI the server computed. `onSaved` runs after a successful save. */
export function ParticipantForm({ onSaved }: { onSaved: () => void }) {
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
  const { firstPage } = useListParams()

  async function onSubmit(participant: CreateParticipant) {
    try {
      const { bmi } = await createParticipant(participant)
      setResult(`Participant saved. BMI: ${bmi}`)
      reset()
      firstPage() // the newest participant is on page 1; the range stays
      onSaved()
    } catch (error) {
      if (!(error instanceof AppError)) throw error // a bug, not a failed request
      const landed = setServerErrors(error, formFields, setError)
      setResult(landed ? 'Could not save participant: check the highlighted fields' : `Could not save participant (${error.message})`)
    }
  }

  return (
    <>
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
    </>
  )
}
