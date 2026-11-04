import { ParticipantForm } from '../features/participants/components/ParticipantForm'
import { ParticipantList } from '../features/participants/components/ParticipantList'

/** Staff record a participant above and browse the list below (ADR 001 › UI). */
export function ParticipantsPage() {
  return (
    <>
      <ParticipantForm />
      <ParticipantList />
    </>
  )
}
