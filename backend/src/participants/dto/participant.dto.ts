// Request shapes for the participants endpoints: types inferred from the shared Zod schemas (ADR 001 › Validation),
// which the controller's ZodValidationPipe enforces at runtime.
export type { CreateParticipant as CreateParticipantDto, ListParticipantsQuery as ListParticipantsQueryDto } from '@curebase/shared';
