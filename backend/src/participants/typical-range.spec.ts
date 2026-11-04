import { isTypicalHeight, isTypicalWeight } from '@curebase/shared';

// The typical ranges (shared/src/schemas/participant.ts): weight 30–250 kg, height 1.20–2.20 m, inclusive, judged
// in standard units whatever unit was entered. Lives here beside the other shared-schema specs.
describe('typical ranges', () => {
  it.each([
    [30, 'kg', true],
    [29.9, 'kg', false],
    [250, 'kg', true],
    [250.1, 'kg', false],
    [67, 'lb', true], // 30.39 kg
    [66, 'lb', false], // 29.94 kg
    [551, 'lb', true], // 249.93 kg
    [552, 'lb', false], // 250.38 kg
  ] as const)('weight %s %s is typical: %s', (weight, unit, typical) => {
    expect(isTypicalWeight(weight, unit)).toBe(typical);
  });

  it.each([
    [120, 'cm', true],
    [119.9, 'cm', false],
    [220, 'cm', true],
    [220.1, 'cm', false],
    [47.25, 'in', true], // 1.20015 m
    [47.2, 'in', false], // 1.19888 m
    [86.6, 'in', true], // 2.19964 m
    [86.65, 'in', false], // 2.20091 m
    // Just inside a bound in inches can convert to just outside it: fine for rough ranges, where it costs one warning.
    [47.24, 'in', false], // 1.199896 m
  ] as const)('height %s %s is typical: %s', (height, unit, typical) => {
    expect(isTypicalHeight(height, unit)).toBe(typical);
  });
});
