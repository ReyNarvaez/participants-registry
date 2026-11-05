import { listParticipantsQuerySchema } from '@curebase/shared';

describe('listParticipantsQuerySchema', () => {
  it('defaults limit to 20 and offset to 0', () => {
    expect(listParticipantsQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('turns the query strings into integers, up to the limit cap of 100', () => {
    expect(listParticipantsQuerySchema.parse({ limit: '100', offset: '40' })).toEqual({ limit: 100, offset: 40 });
    expect(listParticipantsQuerySchema.parse({ limit: '1', offset: '0' })).toEqual({ limit: 1, offset: 0 });
  });

  it.each([
    ['limit', '0'],
    ['limit', '101'],
    ['limit', 'abc'],
    ['limit', ''],
    ['limit', '2.5'],
    ['limit', '1e1'],
    ['limit', ' 5'],
    ['offset', '-1'],
    ['offset', '0x10'],
    ['offset', '99999999999999999999'],
    ['offset', ['1', '2']],
    ['minBmi', '0'],
    ['minBmi', '0.0'],
    ['minBmi', '-1'],
    ['minBmi', 'abc'],
    ['minBmi', ''],
    ['maxBmi', '1e1'],
    ['maxBmi', ' 5'],
    ['maxBmi', ['20', '30']],
  ])('rejects %s=%j with one issue, on that field', (field, value) => {
    const result = listParticipantsQuerySchema.safeParse({ [field]: value });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[field]]);
  });

  it('gives a bad bound one issue on its own field, not a false min > max issue too', () => {
    const result = listParticipantsQuerySchema.safeParse({ minBmi: 'abc', maxBmi: '5' });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['minBmi']]);
  });

  it('rejects a long digit string ending in x (the regex must not backtrack quadratically)', () => {
    const result = listParticipantsQuerySchema.safeParse({ minBmi: '1'.repeat(16_000) + 'x' });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['minBmi']]);
  });

  it('rejects a bound too big for a number (Infinity) with the field rule as its message', () => {
    const result = listParticipantsQuerySchema.safeParse({ maxBmi: '9'.repeat(400) });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['maxBmi'], message: 'Must be a number greater than 0' }),
    ]);
  });

  it('leaves the BMI bounds out when they are not given', () => {
    expect(listParticipantsQuerySchema.parse({})).not.toHaveProperty('minBmi');
    expect(listParticipantsQuerySchema.parse({})).not.toHaveProperty('maxBmi');
  });

  it('turns decimal BMI bounds into numbers, alone or together', () => {
    expect(listParticipantsQuerySchema.parse({ minBmi: '18.5' })).toMatchObject({ minBmi: 18.5 });
    expect(listParticipantsQuerySchema.parse({ maxBmi: '.5' })).toMatchObject({ maxBmi: 0.5 });
    expect(listParticipantsQuerySchema.parse({ minBmi: '18.5', maxBmi: '24.99' })).toMatchObject({
      minBmi: 18.5,
      maxBmi: 24.99,
    });
  });

  it('allows minBmi equal to maxBmi', () => {
    expect(listParticipantsQuerySchema.parse({ minBmi: '22.86', maxBmi: '22.86' })).toMatchObject({
      minBmi: 22.86,
      maxBmi: 22.86,
    });
  });

  it('rejects minBmi above maxBmi with an issue on maxBmi', () => {
    const result = listParticipantsQuerySchema.safeParse({ minBmi: '30', maxBmi: '20.5' });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['maxBmi'] })]);
  });
});
