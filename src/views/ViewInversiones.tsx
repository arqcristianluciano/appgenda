import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useIsMobile } from '../lib/useIsMobile'
import type { Inversion, CatInversion } from '../types'
import { fmtMoney } from '../lib/merge'
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import InversionFormModal from '../components/InversionFormModal'
import { getRate, saveRate, needsDailyPrompt } from '../lib/dolarRate'

type SortCol = 'cat' | 'nombre' | 'compra' | 'actual' | 'rentab' | 'fecha' | 'nota'
type SortDir = 'asc' | 'desc'
const SORT_KEY = 'inv_sort'

function loadSort(): { col: SortCol; dir: SortDir } {
  try { return JSON.parse(localStorage.getItem(SORT_KEY) || 'null') ?? { col: 'cat', dir: 'asc' } }
  catch { return { col: 'cat', dir: 'asc' } }
}

function rentab(inv: Inversion) {
  return inv.compra && inv.actual ? (inv.actual - inv.compra) / inv.compra : -Infinity
}

const CAT_LABELS: Record<CatInversion, string> = {
  inmobiliario: 'Inmobiliario', vehiculos: 'Vehículos',
  financiero: 'Financiero', empresas: 'Empresas',
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
  const isMobile = useIsMobile()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Inversion, 'id'>>(EMPTY)
  const [sort, setSort] = useState(loadSort)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rate, setRate] = useState(getRate)
  const [rateInput, setRateInput] = useState(() => String(getRate()))
  const [showRatePrompt, setShowRatePrompt] = useState(needsDailyPrompt)

  const toUSD = (inv: Inversion, field: 'compra' | 'actual') =>
    (inv[field] || 0) * (inv.moneda === 'DOP' ? 1 / rate : 1)

  const applyRate = (input: string) => {
    const val = parseFloat(input)
    if (!isNaN(val) && val > 0) { saveRate(val); setRate(val) }
  }
  const confirmDailyRate = () => { applyRate(rateInput); setShowRatePrompt(false) }

  const toggleSort = (col: SortCol) => {
    const dir = sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc'
    setSort({ col, dir })
    localStorage.setItem(SORT_KEY, JSON.stringify({ col, dir }))
  }

  const filtered = filtroInv !== 'todas' ? data.inversiones.filter(i => i.cat === filtroInv) : data.inversiones

  const list = useMemo(() => {
    const sorted = [...filtered]
    const { col, dir } = sort
    sorted.sort((a, b) => {
      let cmp = 0
      if (col === 'cat') cmp = CAT_LABELS[a.cat].localeCompare(CAT_LABELS[b.cat])
      else if (col === 'nombre') cmp = a.nombre.localeCompare(b.nombre)
      else if (col === 'compra') cmp = (a.compra || 0) - (b.compra || 0)
      else if (col === 'actual') cmp = (a.actual || 0) - (b.actual || 0)
      else if (col === 'rentab') cmp = rentab(a) - rentab(b)
      else if (col === 'fecha') cmp = (a.fecha || '').localeCompare(b.fecha || '')
      else if (col === 'nota') cmp = (a.nota || '').localeCompare(b.nota || '')
      return dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filtered, sort])

  const totalCompraUSD = data.inversiones.reduce((a, i) => a + toUSD(i, 'compra'), 0)
  const totalActualUSD = data.inversiones.reduce((a, i) => a + toUSD(i, 'actual'), 0)
  const ganancia = totalActualUSD - totalCompraUSD
  const pctTotal = totalCompraUSD > 0 ? ((ganancia / totalCompraUSD) * 100).toFixed(1) : null

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
      {showRatePrompt && <RatePrompt rateInput={rateInput} setRateInput={setRateInput} onConfirm={confirmDailyRate} onSkip={() => setShowRatePrompt(false)} />}
      <SummaryCards totalCompraUSD={totalCompraUSD} totalActualUSD={totalActualUSD} ganancia={ganancia} pctTotal={pctTotal} count={data.inversiones.length} rate={rate} />
      <FiltersBar filtroInv={filtroInv} setFiltroInv={setFiltroInv} rateInput={rateInput} setRateInput={setRateInput} applyRate={applyRate} onAdd={openAdd} />

      {showForm && (
        <InversionFormModal editId={editId} form={form} onChange={setForm}
          onSave={handleSave} onCancel={() => { setShowForm(false); setEditId(null) }} />
      )}

      {!isMobile && selected.size > 0 && (
        <SelectedSummary selected={selected} inversiones={data.inversiones} toUSD={toUSD} onClear={() => setSelected(new Set())} />
      )}

      {isMobile
        ? <MobileCards list={list} onEdit={openEdit} onDelete={deleteInversion} />
        : <DesktopTable list={list} sort={sort} toggleSort={toggleSort} selected={selected} setSelected={setSelected} onEdit={openEdit} onDelete={deleteInversion} />
      }
    </div>
  )
}

function RatePrompt({ rateInput, setRateInput, onConfirm, onSkip }: { rateInput: string; setRateInput: (v: string) => void; onConfirm: () => void; onSkip: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 flex-wrap bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
      <span className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">¿Tasa de hoy?</span>
      <div className="flex items-center gap-1">
        <span className="text-[12px] text-amber-700 dark:text-amber-400">US$1 =</span>
        <input type="number" autoFocus className="w-20 h-7 px-2 bg-white dark:bg-surface border border-amber-300 dark:border-amber-600 rounded-lg text-[13px] text-ink outline-none focus:border-accent"
          value={rateInput} onChange={e => setRateInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onConfirm()} />
        <span className="text-[12px] text-amber-700 dark:text-amber-400">RD$</span>
      </div>
      <button onClick={onConfirm} className="h-7 px-3 bg-accent text-white text-[12px] font-bold rounded-lg">Guardar</button>
      <button onClick={onSkip} className="text-[12px] text-amber-600 dark:text-amber-400 hover:underline ml-auto">Omitir</button>
    </div>
  )
}

function SummaryCards({ totalCompraUSD, totalActualUSD, ganancia, pctTotal, count, rate }: {
  totalCompraUSD: number; totalActualUSD: number; ganancia: number; pctTotal: string | null; count: number; rate: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">{count}</div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Activos</div>
      </div>
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-lg lg:text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalCompraUSD).toLocaleString()}</div>
        <div className="text-[10px] lg:text-[11px] text-ink-3 mt-0.5">RD${Math.round(totalCompraUSD * rate).toLocaleString()}</div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Invertido</div>
      </div>
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-lg lg:text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalActualUSD).toLocaleString()}</div>
        <div className="text-[10px] lg:text-[11px] text-ink-3 mt-0.5">RD${Math.round(totalActualUSD * rate).toLocaleString()}</div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Valor actual</div>
      </div>
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className={`text-lg lg:text-xl font-extrabold tracking-tight leading-none ${ganancia >= 0 ? 'text-accent' : 'text-red-600 dark:text-red-400'}`}>
          {pctTotal ? `${ganancia >= 0 ? '+' : ''}${pctTotal}%` : '—'}
        </div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Rentabilidad</div>
      </div>
    </div>
  )
}

function FiltersBar({ filtroInv, setFiltroInv, rateInput, setRateInput, applyRate, onAdd }: {
  filtroInv: string; setFiltroInv: (v: any) => void; rateInput: string; setRateInput: (v: string) => void; applyRate: (v: string) => void; onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      {([['todas','Todas'],['inmobiliario','Inmob.'],['vehiculos','Vehículos'],['financiero','Financ.'],['empresas','Empresas']] as [string,string][]).map(([f, l]) => (
        <button key={f} onClick={() => setFiltroInv(f)}
          className={`h-7 px-2.5 lg:px-3 rounded-full text-[11px] font-semibold border transition-all
            ${filtroInv === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
          {l}
        </button>
      ))}
      <div className="hidden lg:flex items-center gap-1 border border-edge-mid rounded-lg px-2 h-7 bg-surface-2">
        <span className="text-[11px] text-ink-3 whitespace-nowrap">US$1 =</span>
        <input type="number" className="w-14 bg-transparent text-[12px] text-ink outline-none text-center"
          value={rateInput} onChange={e => setRateInput(e.target.value)}
          onBlur={() => applyRate(rateInput)}
          onKeyDown={e => { if (e.key === 'Enter') { applyRate(rateInput); (e.target as HTMLInputElement).blur() } }} />
        <span className="text-[11px] text-ink-3">RD$</span>
      </div>
      <button onClick={onAdd} className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold bg-accent text-white hover:bg-accent-2 transition-all">
        + Inversión
      </button>
    </div>
  )
}

function SelectedSummary({ selected, inversiones, toUSD, onClear }: {
  selected: Set<string>; inversiones: Inversion[]; toUSD: (i: Inversion, f: 'compra' | 'actual') => number; onClear: () => void
}) {
  const sel = inversiones.filter(i => selected.has(i.id))
  const compra = sel.reduce((a, i) => a + toUSD(i, 'compra'), 0)
  const actual = sel.reduce((a, i) => a + toUSD(i, 'actual'), 0)
  const pct = compra > 0 ? (((actual - compra) / compra) * 100).toFixed(1) : null
  return (
    <div className="mb-4 px-5 py-3 bg-accent/10 border border-accent/30 rounded-xl flex flex-wrap items-center gap-4">
      <span className="text-[12px] font-bold text-accent">{selected.size} seleccionada{selected.size !== 1 ? 's' : ''}</span>
      <span className="text-[12px] text-ink-2">Invertido: <span className="font-bold text-ink">US${Math.round(compra).toLocaleString()}</span></span>
      <span className="text-[12px] text-ink-2">Valor: <span className="font-bold text-ink">US${Math.round(actual).toLocaleString()}</span></span>
      {pct && <span className="text-[12px] text-ink-2">Rentab.: <span className={`font-bold ${parseFloat(pct) >= 0 ? 'text-accent' : 'text-red-500'}`}>{parseFloat(pct) >= 0 ? '+' : ''}{pct}%</span></span>}
      <button onClick={onClear} className="ml-auto text-[11px] text-ink-3 hover:text-ink">Limpiar</button>
    </div>
  )
}

function MobileCards({ list, onEdit, onDelete }: { list: Inversion[]; onEdit: (i: Inversion) => void; onDelete: (id: string) => void }) {
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

function DesktopTable({ list, sort, toggleSort, selected, setSelected, onEdit, onDelete }: {
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
