import type { ReactNode } from 'react'

type FieldProps = { label: string; error?: string; children: ReactNode; unit?: ReactNode }

/** A labelled input with an optional unit control beside it and its error below. */
export function Field({ label, error, children, unit }: FieldProps) {
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
