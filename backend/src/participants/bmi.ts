import { appError, toKg, toMetres, type CreateParticipant } from '@curebase/shared';

type Measurements = Pick<CreateParticipant, 'weight' | 'weightUnit' | 'height' | 'heightUnit'>;

/** BMI = kg / m², rounded to 2 decimals. Throws BMI_UNUSABLE when extreme inputs give no usable BMI. */
export function bmi({ weight, weightUnit, height, heightUnit }: Measurements): number {
  const value = Math.round((toKg(weight, weightUnit) / toMetres(height, heightUnit) ** 2) * 100) / 100;
  // Infinity (height underflows to 0) or 0 after rounding can never match a BMI filter.
  if (!Number.isFinite(value) || value <= 0) throw appError.bmiUnusable();
  return value;
}
