import { useState } from 'react'
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, X } from 'lucide-react'
import { useDatosStore } from '../../store/useDatosStore'
import type { AccesoRemoto, TipoAccesoRemoto } from '../../types'

const EMPTY: Omit<AccesoRemoto, 'id'> = {
  nombre: '', app: 'anydesk', codigo: '', password: '', nota: '',
}

const APP_LABELS: Record<TipoAccesoRemoto, string> = {
  anydesk: 'AnyDesk', teamviewer: 'TeamViewer', rdp: 'RDP / Windows Remote', otro: 'Otro',
}

const APP_COLORS: Record<TipoAccesoRemoto, string> = {
  anydesk: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  teamviewer: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  rdp: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  otro: 'bg-surface-3 text-ink-2',
}

const copy = (text: string) => navigator.clipboard.writeText(text)

type FormData = Omit<AccesoRemoto, 'id'>

function FormAcceso({ form, setForm, onSave, onCancel, editing }: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  onSave: () => void
  onCancel: () => void
  editing: boolean
}) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="bg-surface-2 border border-edge rounded-xl p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Nombre</label>
          <input value={form.nombre} onChange={f('nombre')} placeholder="PC Casa, Mac Oficina…"
            className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Aplicación</label>
          <select value={form.app} onChange={f('app')}
            className="w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink">
            {(Object.keys(APP_LABELS) as TipoAccesoRemoto[]).map((k) => (
              <option key={k} value={k}>{APP_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">ID / Código</label>
          <input value={form.codigo} onChange={f('codigo')} placeholder="123 456 789"
            className="w-full text-[13px] font-mono bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Contraseña</label>
          <input value={form.password} onChange={f('password')} placeholder="••••••••"
            className="w-full text-[13px] font-mono bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1">Nota</label>
          <input value={form.nota} onChange={f('nota')} placeholder="Observaciones…"
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

function AccesoCard({ a, onEdit, onDelete }: {
  a: AccesoRemoto
  onEdit: () => void
  onDelete: () => void
}) {
  const [showPwd, setShowPwd] = useState(false)

  return (
    <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[15px] font-bold text-ink">{a.nombre}</div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${APP_COLORS[a.app]}`}>
            {APP_LABELS[a.app]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink transition-all">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-ink-4 hover:text-red-500 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2">
          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider w-6">ID</span>
          <span className="text-[13px] font-mono text-ink flex-1 tracking-wider">{a.codigo}</span>
          <button onClick={() => copy(a.codigo)} className="text-ink-3 hover:text-accent transition-colors">
            <Copy size={12} />
          </button>
        </div>
        {a.password && (
          <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider w-6">🔑</span>
            <span className="text-[13px] font-mono text-ink flex-1 tracking-wider">
              {showPwd ? a.password : '••••••••'}
            </span>
            <button onClick={() => setShowPwd((v) => !v)} className="text-ink-3 hover:text-accent transition-colors mr-1">
              {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => copy(a.password)} className="text-ink-3 hover:text-accent transition-colors">
              <Copy size={12} />
            </button>
          </div>
        )}
      </div>
      {a.nota && <div className="text-[11px] text-ink-3 mt-2 italic">{a.nota}</div>}
    </div>
  )
}

export default function AccesosRemotos() {
  const { accesos, addAcceso, updateAcceso, deleteAcceso } = useDatosStore()
  const [editing, setEditing] = useState<AccesoRemoto | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)

  const openAdd = () => { setForm(EMPTY); setEditing(null); setAdding(true) }
  const openEdit = (a: AccesoRemoto) => {
    const { id: _id, ...rest } = a
    setForm(rest); setEditing(a); setAdding(false)
  }
  const save = () => {
    if (!form.nombre || !form.codigo) return
    editing ? updateAcceso(editing.id, form) : addAcceso(form)
    setAdding(false); setEditing(null)
  }
  const cancel = () => { setAdding(false); setEditing(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-3">
          {accesos.length} acceso{accesos.length !== 1 ? 's' : ''}
        </span>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <FormAcceso form={form} setForm={setForm} onSave={save} onCancel={cancel} editing={!!editing} />
      )}

      <div className="flex flex-col gap-3">
        {accesos.map((a) => (
          <AccesoCard key={a.id} a={a}
            onEdit={() => openEdit(a)}
            onDelete={() => deleteAcceso(a.id)} />
        ))}
        {accesos.length === 0 && !adding && (
          <div className="text-center py-12 text-ink-3 text-[13px]">
            No hay accesos. Agrega el primero.
          </div>
        )}
      </div>
    </div>
  )
}
