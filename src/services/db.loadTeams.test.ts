import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simulamos firebase/firestore: getDocs lanzara el error de indice no listo.
const getDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: (...args: unknown[]) => getDocs(...args),
  query: vi.fn(),
  where: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  limit: vi.fn(),
}))

// Simulamos la conexion: hay base de datos y un usuario con sesion iniciada.
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1' } },
}))

import { db } from './db'

describe('db.loadTeams', () => {
  beforeEach(() => {
    getDocs.mockReset()
  })

  it('devuelve lista vacia (no lanza) si la consulta de equipos falla', async () => {
    // Reproduce el error de Sentry: el indice de grupo (members/userId) no esta listo.
    getDocs.mockRejectedValueOnce(new Error('The query requires a COLLECTION_GROUP_ASC index'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(db.loadTeams()).resolves.toEqual([])

    spy.mockRestore()
  })
})
