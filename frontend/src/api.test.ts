import { expect, test, vi } from 'vitest'
import { HEALTH_PATH } from '@curebase/shared'
import { getHealth } from './api.ts'

test('getHealth reads the health endpoint through the /api proxy', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ db: 'up' }))
  vi.stubGlobal('fetch', fetch)

  await expect(getHealth()).resolves.toEqual({ db: 'up' })
  expect(fetch).toHaveBeenCalledWith(`/api/${HEALTH_PATH}`)
})
