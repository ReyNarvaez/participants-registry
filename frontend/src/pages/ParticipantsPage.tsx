import { useState } from 'react'
import { ParticipantForm } from '../features/participants/components/ParticipantForm'
import { ParticipantList } from '../features/participants/components/ParticipantList'

/** Staff record a participant above and browse the list below (ADR 001 › UI). */
export function ParticipantsPage() {
  // ponytail: remounting the list after a save makes it re-fetch; TanStack Query invalidation replaces this (ADR 002).
  const [saves, setSaves] = useState(0)
  return (
    <>
      <ParticipantForm onSaved={() => setSaves((n) => n + 1)} />
      <ParticipantList key={saves} />
    </>
  )
}
