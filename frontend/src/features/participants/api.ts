import type { CreateParticipant, Participant, ParticipantList } from '@curebase/shared'
import { request } from '../../lib/api-client'
import type { ListParams } from './list-params'

export const createParticipant = (participant: CreateParticipant) =>
  request<Participant>('/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(participant),
  })

/** One page, newest first. The server's default page size applies; the response says what it was. */
export function listParticipants({ offset, minBmi, maxBmi }: ListParams, signal?: AbortSignal) {
  const query = new URLSearchParams({ offset: String(offset) })
  if (minBmi !== undefined) query.set('minBmi', minBmi)
  if (maxBmi !== undefined) query.set('maxBmi', maxBmi)
  return request<ParticipantList>(`/participants?${query}`, { signal })
}
