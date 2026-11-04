import { appError, type CreateParticipant } from '@curebase/shared';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

type Measurements = Pick<CreateParticipant, 'weight' | 'weightUnit' | 'height' | 'heightUnit'>;

/** BMI = kg / m², rounded to 2 decimals. Throws BMI_UNUSABLE when extreme inputs give no usable BMI. */
export function bmi({ weight, weightUnit, height, heightUnit }: Measurements): number {
  const kg = weightUnit === 'lb' ? weight * KG_PER_LB : weight;
  const m = (heightUnit === 'in' ? height * CM_PER_IN : height) / 100;
  const value = Math.round((kg / m ** 2) * 100) / 100;
  // Infinity (height underflows to 0) or 0 after rounding can never match a BMI filter.
  if (!Number.isFinite(value) || value <= 0) throw appError.bmiUnusable();
  return value;
}
