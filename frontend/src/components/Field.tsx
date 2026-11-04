import { useId, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { FieldError, FieldLabel, Field as UiField } from '@/components/ui/field'

/** What a Field hands its control, so label, error and invalid state reach assistive tech. Spread it on the input. */
export type FieldControlProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }

type FieldProps = {
  label: string
  error?: string
  /**
   * Advice that doesn't block (e.g. an unusual value). Pass it, even as '', on fields that can warn: the polite
   * region announcing it must exist before its text does. An error takes its place.
   */
  warning?: string
  /** A control beside the input, e.g. its unit select. */
  unit?: ReactNode
  children: (control: FieldControlProps) => ReactNode
}

/** A labelled control with its error (or warning) below, announced and describing the control. */
export function Field({ label, error, warning, unit, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const warningId = `${id}-warning`
  const shownWarning = !error && warning ? warning : undefined
  const describedBy = error ? errorId : shownWarning ? warningId : undefined
  const control = children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })
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
      {warning !== undefined && (
        <div id={warningId} aria-live="polite">
          {shownWarning && (
            <p className="flex items-center gap-1.5 text-sm text-warning">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              {shownWarning}
            </p>
          )}
        </div>
      )}
    </UiField>
  )
}
