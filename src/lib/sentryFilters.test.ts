import { describe, it, expect } from 'vitest'
import { esErrorServiceWorkerNoAccionable } from './sentryFilters'

describe('esErrorServiceWorkerNoAccionable', () => {
  it('descarta el fallo de registro del SW por error de certificado SSL', () => {
    const msg =
      "Failed to register a ServiceWorker for scope ('https://appgenda-rd-ad765.web.app/') " +
      "with script ('https://appgenda-rd-ad765.web.app/sw.js'): " +
      'An SSL certificate error occurred when fetching the script.'
    expect(esErrorServiceWorkerNoAccionable(msg)).toBe(true)
  })

  it('descarta el fallo de registro del SW por error desconocido al descargar', () => {
    const msg =
      'Failed to register a ServiceWorker: An unknown error occurred when fetching the script.'
    expect(esErrorServiceWorkerNoAccionable(msg)).toBe(true)
  })

  it('NO descarta otros errores de la app', () => {
    expect(esErrorServiceWorkerNoAccionable('TypeError: cannot read property of undefined')).toBe(false)
    expect(esErrorServiceWorkerNoAccionable('Firestore: permission denied')).toBe(false)
  })

  it('NO descarta un fallo de SW por MIME type (sí sería un problema de despliegue)', () => {
    const msg =
      'Failed to register a ServiceWorker: The script has an unsupported MIME type ' +
      "('text/html')."
    expect(esErrorServiceWorkerNoAccionable(msg)).toBe(false)
  })

  it('tolera mensajes vacíos o nulos', () => {
    expect(esErrorServiceWorkerNoAccionable('')).toBe(false)
    expect(esErrorServiceWorkerNoAccionable(undefined)).toBe(false)
    expect(esErrorServiceWorkerNoAccionable(null)).toBe(false)
  })
})
