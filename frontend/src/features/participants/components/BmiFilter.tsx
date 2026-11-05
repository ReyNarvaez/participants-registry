import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listParticipantsQuerySchema, type ListParticipantsQueryInput } from '@curebase/shared'
import { Field } from '@/components/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requiredFields } from '@/lib/required-fields'
import type { BmiRange } from '../list-params'

const required = requiredFields(listParticipantsQuerySchema.shape)

/** `disabled` holds Apply and Clear while the list is loading. Apply also waits while there is nothing to apply. */
type BmiFilterProps = { range: BmiRange; onApply: (range: BmiRange) => void; disabled?: boolean }

/** Min/max BMI inputs, validated with the list query schema, applied on submit rather than per keystroke. */
export function BmiFilter({ range, onApply, disabled = false }: BmiFilterProps) {
  // raw: submit hands over the validated strings as typed. `values` keeps the inputs on the URL's range (e.g. on Back).
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ListParticipantsQueryInput>({
    resolver: zodResolver(listParticipantsQuerySchema, undefined, { raw: true }),
    values: range,
    mode: 'onTouched',
  })
  // An empty input is no bound; the query schema itself rejects '' (an empty query param).
  // Min re-checks Max: the schema puts the 'max below min' error on Max. Max holds text only once staff left it.
  const bound = { setValueAs: (value: string) => (value === '' ? undefined : value) }
  // Nothing to apply with no bound typed and none applied. Emptied bounds of an applied range still apply (remove it).
  const [minBmi, maxBmi] = useWatch({ control, name: ['minBmi', 'maxBmi'] })
  const nothingToApply = !minBmi && !maxBmi && !range.minBmi && !range.maxBmi
  const apply = handleSubmit(({ minBmi, maxBmi }) => onApply({ minBmi, maxBmi }))

  return (
    <form aria-label="BMI filter" onSubmit={apply} noValidate className="flex flex-wrap items-end gap-3">
      <div className="w-32">
        <Field label="Min BMI" required={required.minBmi} error={errors.minBmi?.message}>
          {(control) => <Input type="text" inputMode="decimal" placeholder="e.g. 18.5" {...control} {...register('minBmi', { ...bound, deps: ['maxBmi'] })} />}
        </Field>
      </div>
      <div className="w-32">
        <Field label="Max BMI" required={required.maxBmi} error={errors.maxBmi?.message}>
          {(control) => <Input type="text" inputMode="decimal" placeholder="e.g. 25" {...control} {...register('maxBmi', bound)} />}
        </Field>
      </div>
      {/* items-end keeps inputs and buttons level however far a long message wraps above an input. */}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={disabled || nothingToApply}>
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
