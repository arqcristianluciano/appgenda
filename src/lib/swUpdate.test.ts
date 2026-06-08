import { describe, it, expect, vi } from 'vitest'
import { safeUpdate } from './swUpdate'

describe('safeUpdate', () => {
  it('no propaga el error cuando falla la descarga del service worker', async () => {
    const reg = {
      update: vi.fn().mockRejectedValue(
        new TypeError('Script https://appgenda-rd-ad765.web.app/sw.js load failed'),
      ),
    } as unknown as ServiceWorkerRegistration

    await expect(safeUpdate(reg)).resolves.toBeUndefined()
    expect(reg.update).toHaveBeenCalledOnce()
  })

  it('llama a update cuando la descarga funciona', async () => {
    const reg = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration

    await expect(safeUpdate(reg)).resolves.toBeUndefined()
    expect(reg.update).toHaveBeenCalledOnce()
  })
})
