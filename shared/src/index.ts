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

// One error shape for every endpoint (ADR 001). NOT_FOUND is beyond the ADR's four: unknown routes keep their 404.
export const errorStatus = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  PHONE_TAKEN: 409,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof errorStatus;

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; details?: { field: string; message: string }[] };
};

// Query values arrive as strings. Digits only: z.coerce.number() would also take '', ' 5', '1e1' and '0x10'.
const wholeNumber = z.string().regex(/^\d+$/, 'Must be a whole number').transform(Number);

export const listParticipantsQuerySchema = z.object({
  limit: wholeNumber.pipe(z.int().min(1).max(100)).default(20),
  offset: wholeNumber.pipe(z.int().min(0)).default(0),
});

export type ListParticipantsQuery = z.output<typeof listParticipantsQuerySchema>;

/** A participant as the API sends it over JSON, so the dates are ISO strings. */
export type Participant = Omit<CreateParticipant, 'dateOfBirth'> & {
  id: string;
  dateOfBirth: string;
  bmi: number;
  createdAt: string;
};

export type ParticipantList = { items: Participant[]; total: number; limit: number; offset: number };
