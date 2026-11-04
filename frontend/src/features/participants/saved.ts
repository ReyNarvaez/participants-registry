import { useSyncExternalStore } from 'react'

// "A participant was saved", from the form to the list, inside this feature.
// ponytail: a hand-rolled signal; TanStack Query's mutation state replaces it (ADR 002 › Server state and the list).
let saves = 0
const listeners = new Set<() => void>()

export function notifyParticipantSaved() {
  saves += 1
  for (const listener of listeners) listener()
}

/** How many saves have happened; a change means the list is out of date. */
export function useParticipantSaves() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => saves,
  )
}
