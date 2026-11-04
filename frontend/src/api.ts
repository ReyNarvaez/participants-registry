import { HEALTH_PATH, type Health } from '@curebase/shared'

export async function getHealth(): Promise<Health> {
  const res = await fetch(`/api/${HEALTH_PATH}`)
  if (!res.ok) throw new Error(`GET /${HEALTH_PATH} failed: ${res.status}`)
  return res.json()
}
