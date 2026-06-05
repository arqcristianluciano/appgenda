import { describe, it, expect, vi } from 'vitest'
import { safeUpdate } from './swUpdate'

const regWith = (update: () => Promise<void>) =>
  ({ update }) as unknown as ServiceWorkerRegistration

describe('safeUpdate', () => {
  it('resuelve cuando update() tiene éxito', async () => {
    const update = vi.fn(() => Promise.resolve())
    await expect(safeUpdate(regWith(update))).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledOnce()
  })

  it('silencia el rechazo "Script <url> load failed" (offline/red intermitente)', async () => {
    const update = vi.fn(() =>
      Promise.reject(new TypeError('Script https://example.com/sw.js load failed')),
    )
    // No debe propagar el rechazo: evita unhandled rejections que Sentry reportaba.
    await expect(safeUpdate(regWith(update))).resolves.toBeUndefined()
  })
})
