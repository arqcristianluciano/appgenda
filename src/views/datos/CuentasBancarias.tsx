import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDatosStore } from '../../store/useDatosStore'
import { useScopeFilter } from '../../components/ScopeFilter'
import { useCanEdit } from '../../hooks/useCanEdit'
import FormCuenta from './FormCuenta'
import CuentaCard from './CuentaCard'
import type { CuentaBancaria } from '../../types'

const EMPTY: Omit<CuentaBancaria, 'id'> = {
  banco: '', tipo: 'ahorro', numero: '', titular: '', telefono: '', nota: '',
  tipoCuenta: 'personal', cedula: '', rnc: '',
  pais: '', swift: '', iban: '', bancoIntermediario: '', direccionBanco: '',
}

export default function CuentasBancarias() {
  const { cuentas, addCuenta, updateCuenta, deleteCuenta } = useDatosStore()
  const scopedCuentas = useScopeFilter(cuentas)
  const canEdit = useCanEdit()
  const [editing, setEditing] = useState<CuentaBancaria | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Omit<CuentaBancaria, 'id'>>(EMPTY)

  const openAdd = () => { setForm(EMPTY); setEditing(null); setAdding(true) }
  const openEdit = (c: CuentaBancaria) => {
    const { id: _id, ...rest } = c
    setForm({ ...EMPTY, ...rest }); setEditing(c); setAdding(false)
  }
  const save = () => {
    if (!form.banco || !form.numero) return
    editing ? updateCuenta(editing.id, form) : addCuenta(form)
    setAdding(false); setEditing(null)
  }
  const cancel = () => { setAdding(false); setEditing(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-3">
          {scopedCuentas.length} cuenta{scopedCuentas.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity">
            <Plus size={13} /> Agregar
          </button>
        )}
      </div>

      {(adding || editing) && (
        <FormCuenta form={form} setForm={setForm} onSave={save} onCancel={cancel} editing={!!editing} />
      )}

      <div className="flex flex-col gap-3">
        {scopedCuentas.map((c) => (
          <CuentaCard key={c.id} cuenta={c} onEdit={canEdit ? () => openEdit(c) : undefined} onDelete={canEdit ? () => deleteCuenta(c.id) : undefined} />
        ))}
        {scopedCuentas.length === 0 && !adding && (
          <div className="text-center py-12 text-ink-3 text-[13px]">
            No hay cuentas. Agrega la primera.
          </div>
        )}
      </div>
    </div>
  )
}
