import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

// Each transform is idempotent (its output re-parses to itself), so the frontend can
// send the parsed form values as JSON and the backend runs the same schema again.
export const createParticipantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
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
  // ponytail: compared to now in UTC, so a date-only "today" counts as past; fine for birth dates.
  dateOfBirth: z
    .union([z.iso.date(), z.iso.datetime()], 'Enter a valid date')
    .pipe(z.coerce.date())
    .refine((date) => date < new Date(), 'Date of birth must be in the past'),
  // Number inputs register with valueAsNumber, so the form already hands over numbers (NaN when empty).
  weight: z.number('Enter a weight').positive('Weight must be greater than 0'),
  weightUnit: z.enum(['kg', 'lb']),
  height: z.number('Enter a height').positive('Height must be greater than 0'),
  heightUnit: z.enum(['cm', 'in']),
});

export type CreateParticipantInput = z.input<typeof createParticipantSchema>;
export type CreateParticipant = z.output<typeof createParticipantSchema>;
