import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { Inversion, CatInversion } from '../types'
import { fmtMoney } from '../lib/merge'
import { Pencil, Trash2 } from 'lucide-react'

const CAT_LABELS: Record<CatInversion, string> = {
  inmobiliario: 'Inmobiliario', vehiculos: 'Vehículos',
  financiero: 'Financiero', empresas: 'Empresas'
}
const CAT_CSS: Record<CatInversion, string> = {
  inmobiliario: 'bg-accent-light text-accent',
  vehiculos: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  financiero: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  empresas: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const EMPTY: Omit<Inversion, 'id'> = { nombre: '', cat: 'inmobiliario', moneda: 'USD', compra: 0, actual: 0, fecha: '', nota: '' }

export default function ViewInversiones() {
  const { data, filtroInv, setFiltroInv, addInversion, updateInversion, deleteInversion } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Inversion, 'id'>>(EMPTY)

  let list = data.inversiones
  if (filtroInv !== 'todas') list = list.filter(i => i.cat === filtroInv)

  const totalCompra = data.inversiones.reduce((a, i) => a + (i.compra || 0) * (i.moneda === 'DOP' ? 1/58 : 1), 0)
  const totalActual = data.inversiones.reduce((a, i) => a + (i.actual || 0) * (i.moneda === 'DOP' ? 1/58 : 1), 0)
  const ganancia = totalActual - totalCompra
  const pctTotal = totalCompra > 0 ? ((ganancia / totalCompra) * 100).toFixed(1) : null

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (inv: Inversion) => { setForm({ ...inv }); setEditId(inv.id); setShowForm(true) }

  const handleSave = () => {
    if (!form.nombre.trim()) return
    if (editId) updateInversion(editId, form)
    else addInversion(form)
    setShowForm(false); setEditId(null)
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
          <div className="text-3xl font-extrabold tracking-tight">{data.inversiones.length}</div>
          <div className="text-[11px] text-ink-3 mt-1 font-medium">Activos</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
          <div className="text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalCompra).toLocaleString()}</div>
          <div className="text-[11px] text-ink-3 mt-1 font-medium">Invertido (aprox.)</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
          <div className="text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalActual).toLocaleString()}</div>
          <div className="text-[11px] text-ink-3 mt-1 font-medium">Valor actual (aprox.)</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
          <div className={`text-xl font-extrabold tracking-tight leading-none ${ganancia >= 0 ? 'text-accent' : 'text-red-600 dark:text-red-400'}`}>
            {pctTotal ? `${ganancia >= 0 ? '+' : ''}${pctTotal}%` : '—'}
          </div>
          <div className="text-[11px] text-ink-3 mt-1 font-medium">Rentabilidad</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {[['todas','Todas'],['inmobiliario','Inmobiliario'],['vehiculos','Vehículos'],['financiero','Financiero'],['empresas','Empresas']].map(([f,l]) => (
          <button key={f} onClick={() => setFiltroInv(f as typeof filtroInv)}
            className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
              ${filtroInv === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
            {l}
          </button>
        ))}
        <button onClick={openAdd} className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold bg-accent text-white hover:bg-accent-2 transition-all">
          + Inversión
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-edge">
            <div className="text-[16px] font-extrabold text-ink mb-4">{editId ? 'Editar inversión' : 'Nueva inversión'}</div>
            <div className="flex flex-col gap-2">
              <input className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
                placeholder="Nombre…" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
                  value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value as CatInversion }))}>
                  {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
                  value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value as 'USD' | 'DOP' }))}>
                  <option value="USD">USD</option>
                  <option value="DOP">DOP</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
                  placeholder="Costo adquisición" value={form.compra || ''} onChange={e => setForm(f => ({ ...f, compra: parseFloat(e.target.value) || 0 }))} />
                <input type="number" className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
                  placeholder="Valor actual" value={form.actual || ''} onChange={e => setForm(f => ({ ...f, actual: parseFloat(e.target.value) || 0 }))} />
              </div>
              <input type="date" className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              <textarea className="px-3 py-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent resize-none min-h-[56px]"
                placeholder="Notas…" value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="h-8 px-3 text-[12px] font-medium text-ink-2 border border-edge-mid rounded-lg hover:bg-surface-2">Cancelar</button>
              <button onClick={handleSave} className="h-8 px-4 text-[12px] font-bold bg-accent text-white rounded-lg hover:bg-accent-2">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-edge rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-2 text-[10px] font-bold uppercase tracking-widest text-ink-3 border-b border-edge">
                <th className="px-4 py-2.5 text-left">Categoría</th>
                <th className="px-4 py-2.5 text-left">Nombre</th>
                <th className="px-4 py-2.5 text-left">Costo</th>
                <th className="px-4 py-2.5 text-left">Valor actual</th>
                <th className="px-4 py-2.5 text-left">Rentab.</th>
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5 text-left">Notas</th>
                <th className="px-4 py-2.5 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-4 text-[13px]">Sin inversiones en esta categoría</td></tr>
              ) : list.map(inv => {
                const gain = inv.compra && inv.actual ? ((inv.actual - inv.compra) / inv.compra * 100).toFixed(1) : null
                const gainCls = !gain ? 'text-ink-3' : parseFloat(gain) > 0 ? 'text-accent font-bold' : 'text-red-600 dark:text-red-400 font-bold'
                return (
                  <tr key={inv.id} className="border-t border-edge hover:bg-surface-2 group">
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CAT_CSS[inv.cat]}`}>{CAT_LABELS[inv.cat]}</span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-ink max-w-[160px] truncate">{inv.nombre}</td>
                    <td className="px-4 py-2.5 text-ink-2">{fmtMoney(inv.compra, inv.moneda)}</td>
                    <td className="px-4 py-2.5 text-ink-2">{fmtMoney(inv.actual, inv.moneda)}</td>
                    <td className={`px-4 py-2.5 ${gainCls}`}>{gain ? `${parseFloat(gain) >= 0 ? '+' : ''}${gain}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-ink-3 text-[12px]">{inv.fecha || '—'}</td>
                    <td className="px-4 py-2.5 text-ink-3 max-w-[140px] truncate text-[12px]">{inv.nota || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(inv)} className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-accent hover:bg-accent-light transition-all"><Pencil size={12} /></button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) deleteInversion(inv.id) }} className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
