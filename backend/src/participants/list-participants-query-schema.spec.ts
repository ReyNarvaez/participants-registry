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
  ])('rejects %s=%j', (field, value) => {
    const result = listParticipantsQuerySchema.safeParse({ [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });
});
