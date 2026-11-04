import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// Returns the parsed value, so transforms apply and unknown keys (e.g. a client-sent bmi) are stripped.
// A ZodError propagates to ErrorFilter, which turns it into the shared 400.
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    return this.schema.parse(value);
  }
}
