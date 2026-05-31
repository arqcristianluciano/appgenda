import { describe, it, expect } from 'vitest'
import { buildStoragePath } from './storagePath'

describe('buildStoragePath', () => {
  it('pone el uid del dueño como primer segmento bajo project-files', () => {
    expect(buildStoragePath('uid123', 'proj1', 'abc', 'foto.png'))
      .toBe('project-files/uid123/proj1/abc-foto.png')
  })

  it('conserva el nombre original del archivo', () => {
    const p = buildStoragePath('u', 'p', 'id', 'mi archivo.pdf')
    expect(p.startsWith('project-files/u/p/')).toBe(true)
    expect(p.endsWith('mi archivo.pdf')).toBe(true)
  })
})
