import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useIsMobile } from '../lib/useIsMobile'
import type { Inversion } from '../types'
import InversionFormModal from '../components/InversionFormModal'
import { getRates, saveRates } from '../lib/dolarRate'
import { CAT_LABELS, SelectedSummary, MobileCards, DesktopTable, FiltersBar } from '../components/InversionList'
import type { SortCol, SortDir } from '../components/InversionList'

const SORT_KEY = 'inv_sort'
const EMPTY: Omit<Inversion, 'id'> = { nombre: '', cat: 'inmobiliario', moneda: 'USD', compra: 0, actual: 0, fecha: '', nota: '' }

function loadSort(): { col: SortCol; dir: SortDir } {
  try { return JSON.parse(localStorage.getItem(SORT_KEY) || 'null') ?? { col: 'cat', dir: 'asc' } }
  catch { return { col: 'cat', dir: 'asc' } }
}

function rentab(inv: Inversion) {
  return inv.compra && inv.actual ? (inv.actual - inv.compra) / inv.compra : -Infinity
}

export default function ViewInversiones() {
  const { data, filtroInv, setFiltroInv, addInversion, updateInversion, deleteInversion } = useStore()
  const isMobile = useIsMobile()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Inversion, 'id'>>(EMPTY)
  const [sort, setSort] = useState(loadSort)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rates, setRates] = useState(getRates)
  const [rateInputs, setRateInputs] = useState(() => { const r = getRates(); return { compra: String(r.compra), venta: String(r.venta) } })

  const toUSD = (inv: Inversion, field: 'compra' | 'actual') =>
    (inv[field] || 0) * (inv.moneda === 'DOP' ? 1 / rates.compra : 1)
  const toDOP = (inv: Inversion, field: 'compra' | 'actual') =>
    (inv[field] || 0) * (inv.moneda === 'USD' ? rates.venta : 1)

  const applyRates = (inputs: { compra: string; venta: string }) => {
    const c = parseFloat(inputs.compra), v = parseFloat(inputs.venta)
    if (!isNaN(c) && c > 0 && !isNaN(v) && v > 0) {
      const next = { compra: c, venta: v }
      saveRates(next); setRates(next)
    }
  }

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
  const totalCompraDOP = data.inversiones.reduce((a, i) => a + toDOP(i, 'compra'), 0)
  const totalActualDOP = data.inversiones.reduce((a, i) => a + toDOP(i, 'actual'), 0)
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
      <RateBar rateInputs={rateInputs} setRateInputs={setRateInputs} applyRates={applyRates} />
      <SummaryCards totalCompraUSD={totalCompraUSD} totalActualUSD={totalActualUSD} totalCompraDOP={totalCompraDOP} totalActualDOP={totalActualDOP} ganancia={ganancia} pctTotal={pctTotal} count={data.inversiones.length} />
      <FiltersBar filtroInv={filtroInv} setFiltroInv={setFiltroInv} onAdd={openAdd} />

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

function RateBar({ rateInputs, setRateInputs, applyRates }: {
  rateInputs: { compra: string; venta: string }; setRateInputs: (v: { compra: string; venta: string }) => void
  applyRates: (v: { compra: string; venta: string }) => void
}) {
  const handleBlur = () => applyRates(rateInputs)
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { applyRates(rateInputs); (e.target as HTMLInputElement).blur() } }
  return (
    <div className="flex items-center gap-4 mb-4 px-4 py-2.5 bg-accent/10 border border-accent/25 rounded-xl flex-wrap">
      <span className="text-[13px] font-semibold text-accent">Tasa del dólar</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">Compra</span>
        <input type="number"
          className="w-18 bg-surface border border-accent/40 rounded-lg px-2 h-8 text-[15px] font-extrabold text-accent outline-none text-center focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={rateInputs.compra} onChange={e => setRateInputs({ ...rateInputs, compra: e.target.value })}
          onBlur={handleBlur} onKeyDown={handleKey}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">Venta</span>
        <input type="number"
          className="w-18 bg-surface border border-accent/40 rounded-lg px-2 h-8 text-[15px] font-extrabold text-accent outline-none text-center focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={rateInputs.venta} onChange={e => setRateInputs({ ...rateInputs, venta: e.target.value })}
          onBlur={handleBlur} onKeyDown={handleKey}
        />
      </div>
    </div>
  )
}

function SummaryCards({ totalCompraUSD, totalActualUSD, totalCompraDOP, totalActualDOP, ganancia, pctTotal, count }: {
  totalCompraUSD: number; totalActualUSD: number; totalCompraDOP: number; totalActualDOP: number
  ganancia: number; pctTotal: string | null; count: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">{count}</div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Activos</div>
      </div>
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-lg lg:text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalCompraUSD).toLocaleString()}</div>
        <div className="text-[10px] lg:text-[11px] text-ink-3 mt-0.5">RD${Math.round(totalCompraDOP).toLocaleString()}</div>
        <div className="text-[11px] text-ink-3 mt-1 font-medium">Invertido</div>
      </div>
      <div className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
        <div className="text-lg lg:text-xl font-extrabold tracking-tight leading-none">US${Math.round(totalActualUSD).toLocaleString()}</div>
        <div className="text-[10px] lg:text-[11px] text-ink-3 mt-0.5">RD${Math.round(totalActualDOP).toLocaleString()}</div>
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

