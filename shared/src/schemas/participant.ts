import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

// Each transform is idempotent (its output re-parses to itself), so the frontend can
// send the parsed form values as JSON and the backend runs the same schema again.
export const createParticipantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  // No default country: numbers must be in international format (+ and country code).
  phone: z.string().transform((value, ctx) => {
    const phone = parsePhoneNumberFromString(value);
    if (!phone?.isValid()) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number in international format, e.g. +14155552671' });
      return z.NEVER;
    }
    return phone.number; // E.164
  }),
  // Accepts the date input's YYYY-MM-DD and the ISO datetime a serialized Date becomes.
  // Must be before today (UTC), so today and a US user's late-evening "tomorrow" are rejected.
  // ponytail: east of UTC, a baby born yesterday local is rejected until UTC midnight; use the client's date if that matters.
  dateOfBirth: z
    .union([z.iso.date('Enter a valid date'), z.iso.datetime('Enter a valid date')])
    .pipe(z.coerce.date())
    .refine((date) => date < new Date(new Date().toISOString().slice(0, 10)), 'Date of birth must be in the past'),
  // Number inputs register with valueAsNumber, so the form already hands over numbers (NaN when empty).
  weight: z.number('Enter a weight').positive('Weight must be greater than 0'),
  weightUnit: z.enum(['kg', 'lb']),
  height: z.number('Enter a height').positive('Height must be greater than 0'),
  heightUnit: z.enum(['cm', 'in']),
});

export type CreateParticipantInput = z.input<typeof createParticipantSchema>;
export type CreateParticipant = z.output<typeof createParticipantSchema>;

// Query values arrive as strings. Digits only: z.coerce.number() would also take '', ' 5', '1e1' and '0x10'.
const wholeNumber = z.string().regex(/^\d+$/, 'Must be a whole number').transform(Number);

// Plain decimals only ('22.5', '.5', '22.'), for the same reason; the frontend sends the input's raw string.
const bmiBound = z
  .string()
  .regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/, 'Must be a number greater than 0') // no overlapping quantifiers: linear time
  .transform(Number)
  .pipe(z.number('Must be a number greater than 0').positive('Must be greater than 0')) // the message covers Infinity
  .optional();

// The frontend BMI filter form validates with this same schema (limit/offset just take their defaults there).
export const listParticipantsQuerySchema = z
  .object({
    limit: wholeNumber.pipe(z.int().min(1).max(100)).default(20),
    offset: wholeNumber.pipe(z.int().min(0)).default(0),
    minBmi: bmiBound,
    maxBmi: bmiBound,
  })
  // Zod runs this even when a bound failed its own check (it is then still a string), so compare only parsed numbers.
  .refine(({ minBmi, maxBmi }) => typeof minBmi !== 'number' || typeof maxBmi !== 'number' || minBmi <= maxBmi, {
    path: ['maxBmi'],
    message: 'Max BMI must be greater than or equal to min BMI',
  });

export type ListParticipantsQueryInput = z.input<typeof listParticipantsQuerySchema>;
export type ListParticipantsQuery = z.output<typeof listParticipantsQuerySchema>;

/** A participant as the API sends it over JSON, so the dates are ISO strings. */
export type Participant = Omit<CreateParticipant, 'dateOfBirth'> & {
  id: string;
  dateOfBirth: string;
  bmi: number;
  createdAt: string;
};

export type ParticipantList = { items: Participant[]; total: number; limit: number; offset: number };
