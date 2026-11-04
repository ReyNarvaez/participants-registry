import { useId, type ReactNode } from 'react'
import { FieldError, FieldLabel, Field as UiField } from '@/components/ui/field'

/** What a Field hands its control, so label, error and invalid state reach assistive tech. Spread it on the input. */
export type FieldControlProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }

type FieldProps = {
  label: string
  error?: string
  /** A control beside the input, e.g. its unit select. */
  unit?: ReactNode
  children: (control: FieldControlProps) => ReactNode
}

/** A labelled control with its error below; the error is announced and described by the control. */
export function Field({ label, error, unit, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const control = children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined })
  return (
    // role undefined: shadcn's Field is an unnamed group otherwise, which screen readers announce as noise.
    <UiField data-invalid={!!error} role={undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {unit ? (
        <div className="flex gap-2">
          {control}
          {unit}
        </div>
      ) : (
        control
      )}
      <FieldError id={errorId}>{error}</FieldError>
    </UiField>
  )
}
