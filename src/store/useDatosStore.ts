import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CuentaBancaria, Contacto, AccesoRemoto } from '../types'
import { loadDatos, saveDatos } from '../lib/storage'
import { db, getUserId } from '../services/db'

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

async function withUserId(fn: (uid: string) => Promise<void>) {
  const uid = await getUserId()
  if (uid) fn(uid).catch(() => {})
}

export const useDatosStore = create<DatosStore>()(
  persist(
    (set, get) => ({
      cuentas: [],
      contactos: [],
      accesos: [],

      addCuenta: (c) => {
        const cuenta = { ...c, id: crypto.randomUUID() }
        set((s) => ({ cuentas: [...s.cuentas, cuenta] }))
        withUserId(uid => db.upsertBankAccount(cuenta as CuentaBancaria, uid))
      },
      updateCuenta: (id, c) => {
        set((s) => ({ cuentas: s.cuentas.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
        const updated = get().cuentas.find(x => x.id === id)
        if (updated) withUserId(uid => db.upsertBankAccount(updated, uid))
      },
      deleteCuenta: (id) => {
        set((s) => ({ cuentas: s.cuentas.filter((x) => x.id !== id) }))
        db.removeBankAccount(id).catch(() => {})
      },

      addContacto: (c) => {
        const contacto = { ...c, id: crypto.randomUUID() }
        set((s) => ({ contactos: [...s.contactos, contacto] }))
        withUserId(uid => db.upsertContact(contacto as Contacto, uid))
      },
      updateContacto: (id, c) => {
        set((s) => ({ contactos: s.contactos.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
        const updated = get().contactos.find(x => x.id === id)
        if (updated) withUserId(uid => db.upsertContact(updated, uid))
      },
      deleteContacto: (id) => {
        set((s) => ({ contactos: s.contactos.filter((x) => x.id !== id) }))
        db.removeContact(id).catch(() => {})
      },

      addAcceso: (a) => {
        const acceso = { ...a, id: crypto.randomUUID() }
        set((s) => ({ accesos: [...s.accesos, acceso] }))
        withUserId(uid => db.upsertAccess(acceso as AccesoRemoto, uid))
      },
      updateAcceso: (id, a) => {
        set((s) => ({ accesos: s.accesos.map((x) => (x.id === id ? { ...x, ...a } : x)) }))
        const updated = get().accesos.find(x => x.id === id)
        if (updated) withUserId(uid => db.upsertAccess(updated, uid))
      },
      deleteAcceso: (id) => {
        set((s) => ({ accesos: s.accesos.filter((x) => x.id !== id) }))
        db.removeAccess(id).catch(() => {})
      },
    }),
    { name: 'datos-cls' }
  )
)

let datosLoaded = false
let datosTimer: ReturnType<typeof setTimeout> | null = null

function flushDatos() {
  const { cuentas, contactos, accesos } = useDatosStore.getState()
  saveDatos({ cuentas, contactos, accesos }).catch(() => {})
}

useDatosStore.subscribe((state, prev) => {
  if (!datosLoaded) return
  if (state.cuentas === prev.cuentas && state.contactos === prev.contactos && state.accesos === prev.accesos) return
  if (datosTimer) clearTimeout(datosTimer)
  datosTimer = setTimeout(() => {
    flushDatos()
    datosTimer = null
  }, 100)
})

window.addEventListener('beforeunload', () => { if (datosLoaded) flushDatos() })
window.addEventListener('pagehide', () => { if (datosLoaded) flushDatos() })

export async function initDatosStore(): Promise<void> {
  const [cuentas, contactos, accesos] = await Promise.all([
    db.loadBankAccounts(), db.loadContacts(), db.loadAccesses(),
  ])

  if (cuentas.length || contactos.length || accesos.length) {
    useDatosStore.setState({ cuentas, contactos, accesos })
  } else {
    const remote = await loadDatos()
    if (remote?.cuentas || remote?.contactos || remote?.accesos) {
      useDatosStore.setState({
        cuentas: (remote.cuentas as CuentaBancaria[]) ?? [],
        contactos: (remote.contactos as Contacto[]) ?? [],
        accesos: (remote.accesos as AccesoRemoto[]) ?? [],
      })
    }
  }
  datosLoaded = true
}
