import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listParticipantsQuerySchema, type ListParticipantsQueryInput } from '@curebase/shared'
import { Field } from '../../../components/Field'
import type { BmiRange } from '../list-params'

type BmiFilterProps = { range: BmiRange; onApply: (range: BmiRange) => void }

/** Min/max BMI inputs, validated with the list query schema, applied on submit rather than per keystroke. */
export function BmiFilter({ range, onApply }: BmiFilterProps) {
  // raw: submit hands over the validated strings as typed. `values` keeps the inputs on the URL's range (e.g. on Back).
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListParticipantsQueryInput>({
    resolver: zodResolver(listParticipantsQuerySchema, undefined, { raw: true }),
    values: range,
  })
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
          reset({ minBmi: undefined, maxBmi: undefined }) // also when no range was applied, so typed text goes
          onApply({})
        }}
      >
        Clear
      </button>
    </form>
  )
}
