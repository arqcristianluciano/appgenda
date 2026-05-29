import type { Inversion, CatInversion } from '../types'

const CAT_LABELS: Record<CatInversion, string> = {
  inmobiliario: 'Inmobiliario', vehiculos: 'Vehículos',
  financiero: 'Financiero', empresas: 'Empresas'
}

interface Props {
  editId: string | null
  form: Omit<Inversion, 'id'>
  setForm: React.Dispatch<React.SetStateAction<Omit<Inversion, 'id'>>>
  onSave: () => void
  onClose: () => void
}

export default function InvFormModal({ editId, form, setForm, onSave, onClose }: Props) {
  const field = (cls: string) =>
    `${cls} h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-edge">
        <div className="text-[16px] font-extrabold text-ink mb-4">{editId ? 'Editar inversión' : 'Nueva inversión'}</div>
        <div className="flex flex-col gap-2">
          <input className={field('')} placeholder="Nombre…"
            value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
              value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value as CatInversion }))}>
              {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
              value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value as 'USD' | 'DOP' }))}>
              <option value="USD">USD</option>
              <option value="DOP">DOP</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" inputMode="decimal" className={field('')} placeholder="Costo adquisición"
              value={form.compra || ''} onChange={e => setForm(f => ({ ...f, compra: parseFloat(e.target.value) || 0 }))} />
            <input type="number" inputMode="decimal" className={field('')} placeholder="Valor actual"
              value={form.actual || ''} onChange={e => setForm(f => ({ ...f, actual: parseFloat(e.target.value) || 0 }))} />
          </div>
          <input type="date" className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
            value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          <textarea className="px-3 py-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent resize-none min-h-[56px]"
            placeholder="Notas…" value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="h-8 px-3 text-[12px] font-medium text-ink-2 border border-edge-mid rounded-lg hover:bg-surface-2">Cancelar</button>
          <button onClick={onSave} className="h-8 px-4 text-[12px] font-bold bg-accent text-white rounded-lg hover:bg-accent-2">Guardar</button>
        </div>
      </div>
    </div>
  )
}
