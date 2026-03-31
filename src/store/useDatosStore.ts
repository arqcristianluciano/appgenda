import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CuentaBancaria, Contacto, AccesoRemoto } from '../types'

interface DatosStore {
  cuentas: CuentaBancaria[]
  contactos: Contacto[]
  accesos: AccesoRemoto[]

  addCuenta: (c: Omit<CuentaBancaria, 'id'>) => void
  updateCuenta: (id: string, c: Partial<CuentaBancaria>) => void
  deleteCuenta: (id: string) => void

  addContacto: (c: Omit<Contacto, 'id'>) => void
  updateContacto: (id: string, c: Partial<Contacto>) => void
  deleteContacto: (id: string) => void

  addAcceso: (a: Omit<AccesoRemoto, 'id'>) => void
  updateAcceso: (id: string, a: Partial<AccesoRemoto>) => void
  deleteAcceso: (id: string) => void
}

export const useDatosStore = create<DatosStore>()(
  persist(
    (set) => ({
      cuentas: [],
      contactos: [],
      accesos: [],

      addCuenta: (c) =>
        set((s) => ({ cuentas: [...s.cuentas, { ...c, id: `cb${Date.now()}` }] })),
      updateCuenta: (id, c) =>
        set((s) => ({ cuentas: s.cuentas.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteCuenta: (id) =>
        set((s) => ({ cuentas: s.cuentas.filter((x) => x.id !== id) })),

      addContacto: (c) =>
        set((s) => ({ contactos: [...s.contactos, { ...c, id: `ct${Date.now()}` }] })),
      updateContacto: (id, c) =>
        set((s) => ({ contactos: s.contactos.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteContacto: (id) =>
        set((s) => ({ contactos: s.contactos.filter((x) => x.id !== id) })),

      addAcceso: (a) =>
        set((s) => ({ accesos: [...s.accesos, { ...a, id: `ar${Date.now()}` }] })),
      updateAcceso: (id, a) =>
        set((s) => ({ accesos: s.accesos.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      deleteAcceso: (id) =>
        set((s) => ({ accesos: s.accesos.filter((x) => x.id !== id) })),
    }),
    { name: 'datos-cls' }
  )
)
