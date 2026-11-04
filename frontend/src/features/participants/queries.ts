import { keepPreviousData, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateParticipant } from '@curebase/shared'
import { createParticipant, listParticipants } from './api'
import type { ListParams } from './list-params'

const keys = {
  all: ['participants'] as const,
  list: (params: ListParams) => ['participants', 'list', params] as const,
  create: ['participants', 'create'] as const,
}

/**
 * One page of the list, with the params that produced it. While another page loads, the previous one stays
 * as placeholder data, so the rows on screen don't vanish.
 */
export function useParticipants(params: ListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: async () => ({ ...(await listParticipants(params)), query: params }),
    placeholderData: keepPreviousData,
  })
}

/** Creates a participant. On success every cached page is out of date (the new participant comes first). */
export function useCreateParticipant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: keys.create,
    mutationFn: (participant: CreateParticipant) => createParticipant(participant),
    // Not awaited: the save is done; the list re-fetches on its own time.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

/** When the latest successful save was submitted (0 if none). A newer one means the list should show page 1. */
export function useLastSaveTime() {
  const times = useMutationState({
    filters: { mutationKey: keys.create, status: 'success' },
    select: (mutation) => mutation.state.submittedAt,
  })
  return Math.max(0, ...times)
}
