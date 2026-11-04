// Units staff can pick per measurement, and conversion to standard units (kg, m). Shared because the backend
// computes BMI with it and the frontend checks typical ranges with it (ADR 002 › Typical ranges).

export const weightUnits = ['kg', 'lb'] as const;
export const heightUnits = ['cm', 'in'] as const;
export type WeightUnit = (typeof weightUnits)[number];
export type HeightUnit = (typeof heightUnits)[number];

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const toKg = (weight: number, unit: WeightUnit) => (unit === 'lb' ? weight * KG_PER_LB : weight);
export const toMetres = (height: number, unit: HeightUnit) => (unit === 'in' ? height * CM_PER_IN : height) / 100;
