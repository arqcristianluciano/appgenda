import { useState } from 'react'
import { Plus, Pencil, Trash2, MessageCircle, Copy, X } from 'lucide-react'
import { useDatosStore } from '../../store/useDatosStore'
import type { CuentaBancaria } from '../../types'

const EMPTY: Omit<CuentaBancaria, 'id'> = {
  banco: '', tipo: 'ahorro', numero: '', titular: '', telefono: '', nota: '',
}

function sendWhatsApp(c: CuentaBancaria) {
  const msg = [
    `*Cuenta ${c.banco}*`,
    `• Titular: ${c.titular}`,
    `• Número: ${c.numero}`,
    `• Tipo: ${c.tipo}`,
    c.nota ? `• Nota: ${c.nota}` : '',
  ].filter(Boolean).join('\n')
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}

const copy = (text: string) => navigator.clipboard.writeText(text)

type FormData = Omit<CuentaBancaria, 'id'>
const field = (
  setForm: React.Dispatch<React.SetStateAction<FormData>>,
  key: keyof FormData
) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
  setForm((p) => ({ ...p, [key]: e.target.value }))

function FormCuenta({ form, setForm, onSave, onCancel, editing }: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  onSave: () => void
  onCancel: () => void
  editing: boolean
}) {
  const f = field(setForm, 'banco')
  return (
    <div className="bg-surface-2 border border-edge rounded-xl p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {([
          ['banco',    'Banco',                'text',   'BHD, Popular…'],
          ['numero',   'Número de cuenta',     'text',   'XXXX XXXX XXXX'],
          ['titular',  'Titular',              'text',   'Nombre completo'],
          ['telefono', 'Teléfono (WhatsApp)',   'tel',    '+1 809 XXX XXXX'],
          ['nota',     'Nota',                 'text',   'Opcional…'],
        ] as const).map(([k, lbl, type, ph]) => (
          <div key={k}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">{lbl}</label>
            <input type={type} value={form[k]} onChange={field(setForm, k)}
              placeholder={ph}
              className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
          </div>
        ))}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Tipo</label>
          <select value={form.tipo} onChange={f}
            className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink">
            {['ahorro', 'corriente', 'nómina'].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink rounded-lg hover:bg-surface-3 transition-all">
          <X size={12} /> Cancelar
        </button>
        <button onClick={onSave} className="px-4 py-1.5 text-[12px] bg-accent text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
          {editing ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </div>
  )
}

export default function CuentasBancarias() {
  const { cuentas, addCuenta, updateCuenta, deleteCuenta } = useDatosStore()
  const [editing, setEditing] = useState<CuentaBancaria | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)

  const openAdd = () => { setForm(EMPTY); setEditing(null); setAdding(true) }
  const openEdit = (c: CuentaBancaria) => {
    const { id: _id, ...rest } = c
    setForm(rest); setEditing(c); setAdding(false)
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
          {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
        </span>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <FormCuenta form={form} setForm={setForm} onSave={save} onCancel={cancel} editing={!!editing} />
      )}

      <div className="flex flex-col gap-3">
        {cuentas.map((c) => (
          <div key={c.id} className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold text-ink">{c.banco}</div>
                <div className="text-[12px] text-ink-3 mt-0.5">{c.titular} · {c.tipo}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => sendWhatsApp(c)} title="Compartir por WhatsApp"
                  className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center hover:opacity-80 transition-opacity">
                  <MessageCircle size={13} />
                </button>
                <button onClick={() => openEdit(c)}
                  className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteCuenta(c.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-ink-4 hover:text-red-500 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 bg-surface-2 rounded-lg px-3 py-2">
              <span className="text-[13px] font-mono text-ink tracking-wider flex-1">{c.numero}</span>
              <button onClick={() => copy(c.numero)} title="Copiar número"
                className="text-ink-3 hover:text-accent transition-colors">
                <Copy size={12} />
              </button>
            </div>
            {c.telefono && (
              <div className="text-[11px] text-ink-3 mt-2">📱 {c.telefono}</div>
            )}
            {c.nota && <div className="text-[11px] text-ink-3 mt-1 italic">{c.nota}</div>}
          </div>
        ))}
        {cuentas.length === 0 && !adding && (
          <div className="text-center py-12 text-ink-3 text-[13px]">
            No hay cuentas. Agrega la primera.
          </div>
        )}
      </div>
    </div>
  )
}
