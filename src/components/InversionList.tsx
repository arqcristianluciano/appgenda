import type { Inversion, CatInversion } from '../types'
import { fmtMoney } from '../lib/merge'

const moneyFmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export type SortCol = 'cat' | 'nombre' | 'compra' | 'actual' | 'rentab' | 'fecha' | 'nota'
export type SortDir = 'asc' | 'desc'

export const CAT_LABELS: Record<CatInversion, string> = {
  inmobiliario: 'Inmobiliario', vehiculos: 'Vehículos',
  financiero: 'Financiero', empresas: 'Empresas',
}
export const CAT_CSS: Record<CatInversion, string> = {
  inmobiliario: 'bg-accent-light text-accent',
  vehiculos: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  financiero: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  empresas: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export function FiltersBar({ filtroInv, setFiltroInv, onAdd }: {
  filtroInv: string; setFiltroInv: (v: any) => void; onAdd: () => void
}) {
  return (
    <div className="sticky -top-5 z-10 flex items-center gap-2 flex-wrap mb-5 pt-5 pb-3 -mt-5 bg-surface-bg shadow-[0_4px_6px_-1px_var(--edge)]">
      {([['todas','Todas'],['inmobiliario','Inmob.'],['vehiculos','Vehículos'],['financiero','Financ.'],['empresas','Empresas']] as [string,string][]).map(([f, l]) => (
        <button key={f} onClick={() => setFiltroInv(f)}
          className={`h-7 px-2.5 lg:px-3 rounded-full text-[11px] font-semibold border transition-all
            ${filtroInv === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
          {l}
        </button>
      ))}
      <button onClick={onAdd} className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold bg-accent text-white hover:bg-accent-2 transition-all">
        + Inversión
      </button>
    </div>
  )
}

export function SelectedSummary({ selected, inversiones, toUSD, onClear }: {
  selected: Set<string>; inversiones: Inversion[]; toUSD: (i: Inversion, f: 'compra' | 'actual') => number; onClear: () => void
}) {
  const sel = inversiones.filter(i => selected.has(i.id))
  const compra = sel.reduce((a, i) => a + toUSD(i, 'compra'), 0)
  const actual = sel.reduce((a, i) => a + toUSD(i, 'actual'), 0)
  const pct = compra > 0 ? (((actual - compra) / compra) * 100).toFixed(1) : null
  return (
    <div className="mb-4 px-5 py-3 bg-accent/10 border border-accent/30 rounded-xl flex flex-wrap items-center gap-4">
      <span className="text-[12px] font-bold text-accent">{selected.size} seleccionada{selected.size !== 1 ? 's' : ''}</span>
      <span className="text-[12px] text-ink-2">Invertido: <span className="font-bold text-ink">{moneyFmtUSD.format(compra)}</span></span>
      <span className="text-[12px] text-ink-2">Valor: <span className="font-bold text-ink">{moneyFmtUSD.format(actual)}</span></span>
      {pct && <span className="text-[12px] text-ink-2">Rentab.: <span className={`font-bold ${parseFloat(pct) >= 0 ? 'text-accent' : 'text-red-500'}`}>{parseFloat(pct) >= 0 ? '+' : ''}{pct}%</span></span>}
      <button onClick={onClear} className="ml-auto text-[11px] text-ink-3 hover:text-ink">Limpiar</button>
    </div>
  )
}

export function MobileCards({ list, onEdit, onDelete }: { list: Inversion[]; onEdit: (i: Inversion) => void; onDelete: (id: string) => void }) {
  if (!list.length) return <div className="text-center py-8 text-ink-4 text-[13px]">Sin inversiones en esta categoría</div>
  return (
    <div className="flex flex-col gap-3">
      {list.map(inv => {
        const gain = inv.compra && inv.actual ? ((inv.actual - inv.compra) / inv.compra * 100).toFixed(1) : null
        const pos = gain ? parseFloat(gain) >= 0 : false
        return (
          <div key={inv.id} className="bg-surface border border-edge rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink truncate">{inv.nombre}</div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${CAT_CSS[inv.cat]}`}>{CAT_LABELS[inv.cat]}</span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onEdit(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-3 hover:text-accent hover:bg-surface-2"><Pencil size={13} /></button>
                <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(inv.id) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-4 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div><div className="text-[10px] text-ink-3">Costo</div><div className="text-[13px] font-bold text-ink">{fmtMoney(inv.compra, inv.moneda)}</div></div>
              <div><div className="text-[10px] text-ink-3">Valor</div><div className="text-[13px] font-bold text-ink">{fmtMoney(inv.actual, inv.moneda)}</div></div>
              <div><div className="text-[10px] text-ink-3">Rentab.</div><div className={`text-[13px] font-bold ${!gain ? 'text-ink-3' : pos ? 'text-accent' : 'text-red-600 dark:text-red-400'}`}>{gain ? `${pos ? '+' : ''}${gain}%` : '—'}</div></div>
            </div>
            {inv.nota && <div className="text-[11px] text-ink-3 mt-2 truncate">{inv.nota}</div>}
          </div>
        )
      })}
    </div>
  )
}

export function DesktopTable({ list, sort, toggleSort, selected, setSelected, onEdit, onDelete }: {
  list: Inversion[]; sort: { col: SortCol; dir: SortDir }; toggleSort: (c: SortCol) => void
  selected: Set<string>; setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
  onEdit: (i: Inversion) => void; onDelete: (id: string) => void
}) {
  const allSel = list.length > 0 && list.every(i => selected.has(i.id))
  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev); allSel ? list.forEach(i => n.delete(i.id)) : list.forEach(i => n.add(i.id)); return n
  })
  const toggleOne = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sort.col !== col) return <ChevronsUpDown size={12} className="inline ml-1 opacity-50" />
    return sort.dir === 'asc' ? <ChevronUp size={12} className="inline ml-1 text-accent" /> : <ChevronDown size={12} className="inline ml-1 text-accent" />
  }

  return (
    <div className="bg-surface border border-edge rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-[10px] font-bold uppercase tracking-widest text-ink-3 border-b border-edge">
              <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allSel} onChange={toggleAll} className="w-3.5 h-3.5 cursor-pointer accent-[var(--accent)]" /></th>
              {([['cat','Categoría'],['nombre','Nombre'],['compra','Costo'],['actual','Valor actual'],['rentab','Rentab.'],['fecha','Fecha'],['nota','Notas']] as [SortCol, string][]).map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)} className="px-4 py-2.5 text-left cursor-pointer select-none hover:text-ink hover:bg-surface-3 transition-colors whitespace-nowrap">
                  {label}<SortIcon col={col} />
                </th>
              ))}
              <th className="px-4 py-2.5 w-14"></th>
            </tr>
          </thead>
          <tbody>
            {!list.length ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-4 text-[13px]">Sin inversiones en esta categoría</td></tr>
            ) : list.map(inv => {
              const gain = inv.compra && inv.actual ? ((inv.actual - inv.compra) / inv.compra * 100).toFixed(1) : null
              const gainCls = !gain ? 'text-ink-3' : parseFloat(gain) > 0 ? 'text-accent font-bold' : 'text-red-600 dark:text-red-400 font-bold'
              return (
                <tr key={inv.id} onClick={() => toggleOne(inv.id)} className={`border-t border-edge cursor-pointer group transition-colors ${selected.has(inv.id) ? 'bg-accent/5' : 'hover:bg-surface-2'}`}>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleOne(inv.id)} className="w-3.5 h-3.5 cursor-pointer accent-[var(--accent)]" /></td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CAT_CSS[inv.cat]}`}>{CAT_LABELS[inv.cat]}</span></td>
                  <td className="px-4 py-2.5 font-semibold text-ink max-w-[160px] truncate">{inv.nombre}</td>
                  <td className="px-4 py-2.5 text-ink-2">{fmtMoney(inv.compra, inv.moneda)}</td>
                  <td className="px-4 py-2.5 text-ink-2">{fmtMoney(inv.actual, inv.moneda)}</td>
                  <td className={`px-4 py-2.5 ${gainCls}`}>{gain ? `${parseFloat(gain) >= 0 ? '+' : ''}${gain}%` : '—'}</td>
                  <td className="px-4 py-2.5 text-ink-3 text-[12px]">{inv.fecha || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-3 max-w-[140px] truncate text-[12px]">{inv.nota || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); onEdit(inv) }} className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-accent hover:bg-accent-light transition-all"><Pencil size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar?')) onDelete(inv.id) }} className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
