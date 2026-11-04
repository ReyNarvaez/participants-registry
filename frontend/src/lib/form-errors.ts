import type { AppError } from '@curebase/shared'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/**
 * Puts a server error on a form's own fields (the catalog's fields for its code, or its details) and returns how
 * many landed, so the caller can fall back to a form-level message. Fields the form doesn't have are dropped.
 */
export function setServerErrors<T extends FieldValues>(
  error: AppError,
  formFields: readonly string[],
  setError: UseFormSetError<T>,
): number {
  const landed = error.fieldErrors().filter(({ field }) => formFields.includes(field))
  for (const { field, message } of landed) setError(field as Path<T>, { message })
  return landed.length
}
