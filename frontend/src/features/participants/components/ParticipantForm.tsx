import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppError, appError, createParticipantSchema, type CreateParticipant, type CreateParticipantInput } from '@curebase/shared'
import { Field } from '../../../components/Field'
import { setServerErrors } from '../../../lib/form-errors'
import { createParticipant } from '../api'
import { notifyParticipantSaved } from '../saved'

const formFields = Object.keys(createParticipantSchema.shape)

/** Creates a participant and shows the BMI the server computed; the list then shows it on page 1. */
export function ParticipantForm() {
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
    try {
      const { bmi } = await createParticipant(participant)
      setResult(`Participant saved. BMI: ${bmi}`)
      reset()
      notifyParticipantSaved()
    } catch (error) {
      if (!(error instanceof AppError)) {
        console.error(error) // a bug, not a failed request: keep it visible, but still answer the user
        return setResult(`Could not save participant (${appError.internal().message})`)
      }
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
