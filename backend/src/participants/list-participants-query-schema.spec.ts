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
  ])('rejects %s=%j', (field, value) => {
    const result = listParticipantsQuerySchema.safeParse({ [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it('leaves the BMI bounds out when they are not given', () => {
    expect(listParticipantsQuerySchema.parse({})).not.toHaveProperty('minBmi');
    expect(listParticipantsQuerySchema.parse({})).not.toHaveProperty('maxBmi');
  });

  it('turns decimal BMI bounds into numbers, alone or together', () => {
    expect(listParticipantsQuerySchema.parse({ minBmi: '18.5' })).toMatchObject({ minBmi: 18.5 });
    expect(listParticipantsQuerySchema.parse({ maxBmi: '.5' })).toMatchObject({ maxBmi: 0.5 });
    expect(listParticipantsQuerySchema.parse({ minBmi: '18.5', maxBmi: '24.99' })).toMatchObject({ minBmi: 18.5, maxBmi: 24.99 });
  });

  it('allows minBmi equal to maxBmi', () => {
    expect(listParticipantsQuerySchema.parse({ minBmi: '22.86', maxBmi: '22.86' })).toMatchObject({ minBmi: 22.86, maxBmi: 22.86 });
  });

  it('rejects minBmi above maxBmi with an issue on maxBmi', () => {
    const result = listParticipantsQuerySchema.safeParse({ minBmi: '30', maxBmi: '20.5' });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['maxBmi'] })]);
  });
});
