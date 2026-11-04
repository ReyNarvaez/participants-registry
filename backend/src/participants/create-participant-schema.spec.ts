import { createParticipantSchema } from '@curebase/shared';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1 (415) 555-2671',
  dateOfBirth: '1990-12-10',
  weight: 60,
  weightUnit: 'kg',
  height: 165,
  heightUnit: 'cm',
};

describe('createParticipantSchema', () => {
  it('normalizes the phone to E.164, parses the date and strips a client bmi', () => {
    const parsed = createParticipantSchema.parse({ ...valid, bmi: 999 });
    expect(parsed.phone).toBe('+14155552671');
    expect(parsed.dateOfBirth).toEqual(new Date('1990-12-10'));
    expect(parsed).not.toHaveProperty('bmi');
    expect(createParticipantSchema.parse({ ...valid, email: ' Ada@Example.COM ' }).email).toBe('ada@example.com');
    // The parsed value survives JSON (frontend → backend) and parses to itself.
    expect(createParticipantSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it.each([
    ['fictional 555 number', { phone: '+15551234567' }],
    ['number without country code', { phone: '4155552671' }],
    ['future date of birth', { dateOfBirth: '2999-01-01' }],
    ['date of birth of today', { dateOfBirth: new Date().toISOString().slice(0, 10) }],
    ['impossible date', { dateOfBirth: '1990-02-30' }],
  ])('rejects a %s', (_, override) => {
    expect(createParticipantSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
