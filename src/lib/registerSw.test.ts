import { describe, it, expect, vi } from 'vitest'
import { registerServiceWorker } from './registerSw'

describe('registerServiceWorker', () => {
  it('devuelve el registro cuando el navegador lo registra correctamente', async () => {
    const reg = {} as ServiceWorkerRegistration
    const container = {
      register: vi.fn().mockResolvedValue(reg),
    } as unknown as ServiceWorkerContainer

    await expect(registerServiceWorker(container)).resolves.toBe(reg)
    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('no propaga el error si la carga del script falla (devuelve null)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const container = {
      register: vi
        .fn()
        .mockRejectedValue(new TypeError('Script https://x/sw.js load failed')),
    } as unknown as ServiceWorkerContainer

    await expect(registerServiceWorker(container)).resolves.toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
