import { ValidationError } from '../validation.error.js';
import { bmi } from './bmi.js';

describe('bmi', () => {
  it('converts every unit combination to kg and m, then rounds to 2 decimals', () => {
    // 70 / 1.75² = 22.857… (rounds up)
    expect(bmi({ weight: 70, weightUnit: 'kg', height: 175, heightUnit: 'cm' })).toBe(22.86);
    // 70 / (70 × 0.0254)² = 70 / 3.161284 = 22.142… (rounds down)
    expect(bmi({ weight: 70, weightUnit: 'kg', height: 70, heightUnit: 'in' })).toBe(22.14);
    // 150 × 0.45359237 / 1.75² = 68.0388555 / 3.0625 = 22.216…
    expect(bmi({ weight: 150, weightUnit: 'lb', height: 175, heightUnit: 'cm' })).toBe(22.22);
    // 68.0388555 / (65 × 0.0254)² = 68.0388555 / 2.725801 = 24.961…
    expect(bmi({ weight: 150, weightUnit: 'lb', height: 65, heightUnit: 'in' })).toBe(24.96);
  });

  it.each([
    ['infinite (height underflows)', { weight: 70, weightUnit: 'kg', height: 1e-160, heightUnit: 'cm' }],
    ['0 after rounding', { weight: 1e-6, weightUnit: 'kg', height: 175, heightUnit: 'cm' }],
  ] as const)('rejects a BMI that is %s', (_, measurements) => {
    expect(() => bmi(measurements)).toThrow(ValidationError);
  });
});
