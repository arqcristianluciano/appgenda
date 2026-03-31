import { useState } from 'react'
import { Plus, Pencil, Trash2, MessageCircle, Copy, X } from 'lucide-react'
import { useDatosStore } from '../../store/useDatosStore'
import type { Contacto } from '../../types'

const EMPTY: Omit<Contacto, 'id'> = {
  nombre: '', cedula: '', telefono: '', email: '', nota: '',
}

const copy = (text: string) => navigator.clipboard.writeText(text)

function openWhatsApp(telefono: string) {
  const phone = telefono.replace(/\D/g, '')
  window.open(`https://wa.me/${phone}`, '_blank')
}

type FormData = Omit<Contacto, 'id'>

function FormContacto({ form, setForm, onSave, onCancel, editing }: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  onSave: () => void
  onCancel: () => void
  editing: boolean
}) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="bg-surface-2 border border-edge rounded-xl p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {([
          ['nombre',   'Nombre',    'Fulano de Tal'],
          ['cedula',   'Cédula',    '000-0000000-0'],
          ['telefono', 'Teléfono',  '+1 809 XXX XXXX'],
          ['email',    'Email',     'correo@ejemplo.com'],
        ] as const).map(([k, lbl, ph]) => (
          <div key={k}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">{lbl}</label>
            <input value={form[k]} onChange={f(k)} placeholder={ph}
              className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Nota</label>
          <input value={form.nota} onChange={f('nota')} placeholder="Relación, observaciones…"
            className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
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

export default function Contactos() {
  const { contactos, addContacto, updateContacto, deleteContacto } = useDatosStore()
  const [editing, setEditing] = useState<Contacto | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)

  const openAdd = () => { setForm(EMPTY); setEditing(null); setAdding(true) }
  const openEdit = (c: Contacto) => {
    const { id: _id, ...rest } = c
    setForm(rest); setEditing(c); setAdding(false)
  }
  const save = () => {
    if (!form.nombre) return
    editing ? updateContacto(editing.id, form) : addContacto(form)
    setAdding(false); setEditing(null)
  }
  const cancel = () => { setAdding(false); setEditing(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-3">
          {contactos.length} contacto{contactos.length !== 1 ? 's' : ''}
        </span>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <FormContacto form={form} setForm={setForm} onSave={save} onCancel={cancel} editing={!!editing} />
      )}

      <div className="flex flex-col gap-3">
        {contactos.map((c) => (
          <div key={c.id} className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold text-ink">{c.nombre}</div>
                {c.nota && <div className="text-[11px] text-ink-3 mt-0.5">{c.nota}</div>}
              </div>
              <div className="flex items-center gap-1.5">
                {c.telefono && (
                  <button onClick={() => openWhatsApp(c.telefono)} title="Abrir WhatsApp"
                    className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center hover:opacity-80 transition-opacity">
                    <MessageCircle size={13} />
                  </button>
                )}
                <button onClick={() => openEdit(c)}
                  className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteContacto(c.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-ink-4 hover:text-red-500 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {c.cedula && (
                <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider w-12">Cédula</span>
                  <span className="text-[13px] font-mono text-ink flex-1">{c.cedula}</span>
                  <button onClick={() => copy(c.cedula)} className="text-ink-3 hover:text-accent transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
              )}
              {c.telefono && (
                <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider w-12">Tel.</span>
                  <span className="text-[13px] font-mono text-ink flex-1">{c.telefono}</span>
                  <button onClick={() => copy(c.telefono)} className="text-ink-3 hover:text-accent transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2 sm:col-span-2">
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider w-12">Email</span>
                  <span className="text-[13px] text-ink flex-1 truncate">{c.email}</span>
                  <button onClick={() => copy(c.email)} className="text-ink-3 hover:text-accent transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {contactos.length === 0 && !adding && (
          <div className="text-center py-12 text-ink-3 text-[13px]">
            No hay contactos. Agrega el primero.
          </div>
        )}
      </div>
    </div>
  )
}
