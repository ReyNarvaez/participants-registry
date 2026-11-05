import { useId, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { FieldError, FieldLabel, Field as UiField } from '@/components/ui/field'

/** What a Field hands its control, so label, error and invalid state reach assistive tech. Spread it on the input. */
export type FieldControlProps = {
  id: string
  'aria-invalid': boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
}

type FieldProps = {
  label: string
  /** Marks the label with an asterisk and the control as required; take it from the form's schema (requiredFields). */
  required?: boolean
  error?: string
  /** Advice that doesn't block (e.g. an unusual value), announced politely. An error takes its place. */
  warning?: string
  /** A control beside the input, e.g. its unit select. */
  unit?: ReactNode
  children: (control: FieldControlProps) => ReactNode
}

/** A labelled control with its error (or warning) beside the label, announced and describing the control. */
export function Field({ label, required = false, error, warning, unit, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const warningId = `${id}-warning`
  const shownWarning = !error && warning ? warning : undefined
  const describedBy = error ? errorId : shownWarning ? warningId : undefined
  const control = children({
    id,
    'aria-invalid': !!error,
    'aria-required': required || undefined,
    'aria-describedby': describedBy,
  })
  return (
    // role undefined: shadcn's Field is an unnamed group otherwise, which screen readers announce as noise.
    <UiField data-invalid={!!error} role={undefined}>
      {/* As tall as a message even without one, so the input does not jump when one appears. Wraps when narrow. */}
      <div className="flex min-h-5 flex-wrap items-center gap-y-1">
        <div className="mr-2 flex items-baseline gap-0.5">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {/* Visual only: screen readers hear aria-required on the control instead. */}
          {required && (
            <span aria-hidden="true" className="text-sm text-destructive">
              *
            </span>
          )}
        </div>
        <FieldError id={errorId}>{error}</FieldError>
        {/* Always mounted: a live region must exist before its text, or screen readers skip it. */}
        <div id={warningId} aria-live="polite">
          {shownWarning && (
            <p className="flex items-center gap-1.5 text-sm text-warning">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              {shownWarning}
            </p>
          )}
        </div>
      </div>
      {unit ? (
        <div className="flex gap-2">
          {control}
          {unit}
        </div>
      ) : (
        control
      )}
    </UiField>
  )
}
