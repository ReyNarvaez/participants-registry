import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CircleCheck } from 'lucide-react'
import {
  AppError,
  createParticipantSchema,
  isTypicalHeight,
  isTypicalWeight,
  type CreateParticipant,
  type CreateParticipantInput,
} from '@curebase/shared'
import { Field } from '@/components/Field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { asAppError } from '@/lib/api-client'
import { setServerErrors } from '@/lib/form-errors'
import { useListParams } from '../list-params'
import { useCreateParticipant } from '../queries'

const formFields = Object.keys(createParticipantSchema.shape)
const { weightUnit, heightUnit } = createParticipantSchema.shape

type Result = { ok: boolean; text: string }

/** A number a typical-range check can judge; anything else is the schema's to reject. */
const isMeasurement = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

/** Creates a participant and shows the BMI the server computed; the list then shows it on page 1. */
export function ParticipantForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isSubmitted, touchedFields },
  } = useForm<CreateParticipantInput, unknown, CreateParticipant>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: { weightUnit: 'kg', heightUnit: 'cm' },
  })
  const [result, setResult] = useState<Result>()

  // Typical-range warnings (ADR 002): advice only. Shown once the field was left or the form submitted, so they don't
  // flicker while a number is typed; changing the unit re-checks at once.
  const [weight, weightIn, height, heightIn] = useWatch({ control, name: ['weight', 'weightUnit', 'height', 'heightUnit'] })
  const checked = (field: 'weight' | 'height') => !!touchedFields[field] || isSubmitted
  const weightWarning =
    checked('weight') && isMeasurement(weight) && !isTypicalWeight(weight, weightIn) ? 'Unusual weight: check the unit' : ''
  const heightWarning =
    checked('height') && isMeasurement(height) && !isTypicalHeight(height, heightIn) ? 'Unusual height: check the unit' : ''
  const create = useCreateParticipant()
  const { firstPage } = useListParams()

  async function onSubmit(participant: CreateParticipant) {
    try {
      const { bmi } = await create.mutateAsync(participant)
      setResult({ ok: true, text: `Participant saved. BMI: ${bmi}` })
      reset()
      firstPage() // the newest participant is on page 1; the range stays
    } catch (error) {
      if (!(error instanceof AppError)) {
        console.error(error) // a bug, not a failed request: keep it visible, but still answer the user
        return setResult({ ok: false, text: `Could not save participant (${asAppError(error).message})` })
      }
      const landed = setServerErrors(error, formFields, setError)
      setResult({
        ok: false,
        text: landed ? 'Could not save participant: check the highlighted fields' : `Could not save participant (${error.message})`,
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>New participant</h2>
        </CardTitle>
        <CardDescription>BMI is computed from weight and height when you save.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              {(control) => <Input autoComplete="off" {...control} {...register('name')} />}
            </Field>
            <Field label="Email" error={errors.email?.message}>
              {(control) => <Input type="email" autoComplete="off" {...control} {...register('email')} />}
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              {(control) => <Input type="tel" placeholder="+14155552671" {...control} {...register('phone')} />}
            </Field>
            <Field label="Date of birth" error={errors.dateOfBirth?.message}>
              {(control) => <Input type="date" {...control} {...register('dateOfBirth')} />}
            </Field>
            <Field
              label="Weight"
              error={errors.weight?.message}
              warning={weightWarning}
              unit={
                <NativeSelect aria-label="Weight unit" className="w-20 shrink-0" {...register('weightUnit')}>
                  {weightUnit.options.map((unit) => (
                    <NativeSelectOption key={unit}>{unit}</NativeSelectOption>
                  ))}
                </NativeSelect>
              }
            >
              {(control) => (
                <Input type="number" step="any" {...control} {...register('weight', { valueAsNumber: true, deps: ['height'] })} />
              )}
            </Field>
            <Field
              label="Height"
              error={errors.height?.message}
              warning={heightWarning}
              unit={
                <NativeSelect aria-label="Height unit" className="w-20 shrink-0" {...register('heightUnit')}>
                  {heightUnit.options.map((unit) => (
                    <NativeSelectOption key={unit}>{unit}</NativeSelectOption>
                  ))}
                </NativeSelect>
              }
            >
              {(control) => (
                <Input type="number" step="any" {...control} {...register('height', { valueAsNumber: true, deps: ['weight'] })} />
              )}
            </Field>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Save participant
          </Button>
        </form>
        {/* A success is announced politely by a status region that is always mounted (so changes to it are heard);
            a failure is its own alert, which interrupts like the field errors it may point to. */}
        <div role="status">
          {result?.ok && (
            <Alert role="none">
              <CircleCheck className="text-primary" />
              <AlertDescription>{result.text}</AlertDescription>
            </Alert>
          )}
        </div>
        {result && !result.ok && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{result.text}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
