import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listParticipantsQuerySchema, type ListParticipantsQueryInput } from '@curebase/shared'
import { Field } from '@/components/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BmiRange } from '../list-params'

/** `disabled` holds Apply and Clear while the list is loading. */
type BmiFilterProps = { range: BmiRange; onApply: (range: BmiRange) => void; disabled?: boolean }

/** Min/max BMI inputs, validated with the list query schema, applied on submit rather than per keystroke. */
export function BmiFilter({ range, onApply, disabled = false }: BmiFilterProps) {
  // raw: submit hands over the validated strings as typed. `values` keeps the inputs on the URL's range (e.g. on Back).
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListParticipantsQueryInput>({
    resolver: zodResolver(listParticipantsQuerySchema, undefined, { raw: true }),
    values: range,
    mode: 'onTouched',
  })
  // An empty input is no bound; the query schema itself rejects '' (an empty query param).
  const bound = { setValueAs: (value: string) => (value === '' ? undefined : value) }
  const apply = handleSubmit(({ minBmi, maxBmi }) => onApply({ minBmi, maxBmi }))

  return (
    <form aria-label="BMI filter" onSubmit={apply} noValidate className="flex flex-wrap items-start gap-3">
      <div className="w-32">
        <Field label="Min BMI" error={errors.minBmi?.message}>
          {(control) => <Input type="text" inputMode="decimal" placeholder="e.g. 18.5" {...control} {...register('minBmi', bound)} />}
        </Field>
      </div>
      <div className="w-32">
        <Field label="Max BMI" error={errors.maxBmi?.message}>
          {(control) => <Input type="text" inputMode="decimal" placeholder="e.g. 25" {...control} {...register('maxBmi', bound)} />}
        </Field>
      </div>
      {/* Level with the inputs, below their labels, when they share a row; no gap when the buttons wrap. */}
      <div className="flex gap-2 sm:pt-6">
        <Button type="submit" variant="secondary" disabled={disabled}>
          Apply
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            reset({ minBmi: undefined, maxBmi: undefined }) // also when no range was applied, so typed text goes
            onApply({})
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
