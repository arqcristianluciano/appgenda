import { useRef, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useIsMobile } from '../lib/useIsMobile'
import { getFechaStatus, mesLabel } from '../lib/merge'
import { TIPO_LABELS, TIPO_BADGE } from '../lib/obligaciones'
import ScopeFilter, { useScopeFilter } from '../components/ScopeFilter'
import { useCanEdit } from '../hooks/useCanEdit'
import type { Pago, Obligacion, TipoObligacion } from '../types'

interface ObligForm { txt: string; tipo: TipoObligacion; dia: string }
const EMPTY_FORM: ObligForm = { txt: '', tipo: 'tarjeta', dia: '' }

export default function ViewFinanzas() {
  const { data, togglePago, setPagoFecha, addObligacion, updateObligacion, deleteObligacion } = useStore()
  const isMobile = useIsMobile()
  const canEdit = useCanEdit()
  const currentRef = useRef<HTMLDivElement>(null)
  const scopedObligaciones = useScopeFilter(data.obligaciones)
  const scopedOblIds = new Set(scopedObligaciones.map(o => o.id))
  const pagos = data.pagos.filter(p => scopedOblIds.has(p.oblId))

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ObligForm>(EMPTY_FORM)

  const byMes: Record<string, typeof pagos> = {}
  pagos.forEach(p => {
    if (!byMes[p.mes]) byMes[p.mes] = []
    byMes[p.mes].push(p)
  })
  const now = new Date()
  const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const meses = Object.keys(byMes).sort((a, b) => b.localeCompare(a))

  useEffect(() => {
    const el = currentRef.current
    if (!el) return
    const main = el.closest('main')
    if (main) main.scrollTop = el.offsetTop - main.offsetTop - 120
  }, [])

  const allPend = pagos.filter(p => !p.done)
  const allDone = pagos.filter(p => p.done)
  const alertas = allPend.filter(p => getFechaStatus(p.fecha)).length

  const openAdd = () => { if (!canEdit) return; setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (id: string) => {
    if (!canEdit) return
    const ob = data.obligaciones.find(o => o.id === id)
    if (!ob) return
    setForm({ txt: ob.txt, tipo: ob.tipo, dia: '' })
    setEditId(ob.id)
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }
  const handleSave = () => {
    const txt = form.txt.trim()
    if (!txt) return
    if (editId) updateObligacion(editId, { txt, tipo: form.tipo })
    else addObligacion(txt, form.tipo, form.dia.trim() || undefined)
    closeForm()
  }
  const handleDelete = () => {
    if (!editId) return
    const ob = scopedObligaciones.find(o => o.id === editId)
    const ok = window.confirm(
      `¿Eliminar "${ob?.txt ?? 'este gasto'}"? Se borrará junto con todos sus pagos registrados. Esta acción no se puede deshacer.`,
    )
    if (!ok) return
    deleteObligacion(editId)
    closeForm()
  }

  return (
    <div>
      <div className="sticky -top-5 z-10 -mt-5 pt-5 pb-3 bg-surface-bg shadow-[0_4px_6px_-1px_var(--edge)]">
        <ScopeFilter />
        {canEdit && (
          <div className="flex justify-end mb-3">
            <button onClick={openAdd}
              className="h-8 px-4 rounded-lg text-[12px] font-bold bg-accent text-white hover:bg-accent-2 transition-all flex items-center gap-1.5">
              <Plus size={14} /> Nuevo gasto
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { val: allPend.length, label: 'Pendientes', cls: 'text-red-600 dark:text-red-400' },
          { val: allDone.length, label: 'Pagados', cls: 'text-accent' },
          { val: alertas, label: 'Con alerta', cls: 'text-amber-600 dark:text-amber-400' },
          { val: scopedObligaciones.length, label: 'Gastos fijos', cls: '' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-edge rounded-xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm">
            <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight leading-none ${s.cls}`}>{s.val}</div>
            <div className="text-[11px] text-ink-3 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
        </div>
      </div>

      {showForm && (
        <ObligacionFormModal editId={editId} form={form} setForm={setForm}
          onSave={handleSave} onDelete={handleDelete} onClose={closeForm} />
      )}

      <div className="flex flex-col gap-4">
        {meses.map(mes => {
          // Dentro de cada mes, ordenar por fecha de vencimiento (más temprana
          // primero). Los pagos sin fecha quedan al final.
          const records = [...byMes[mes]].sort((a, b) => {
            if (!a.fecha) return b.fecha ? 1 : 0
            if (!b.fecha) return -1
            return a.fecha.localeCompare(b.fecha)
          })
          const done = records.filter(p => p.done).length
          const pct = records.length ? Math.round(done / records.length * 100) : 0
          const isComplete = records.every(p => p.done)

          return (
            <div key={mes} ref={mes === currentMes ? currentRef : undefined} className={`bg-surface border border-edge rounded-xl shadow-sm ${isComplete ? 'opacity-60' : ''}`}>
              <MesHeader mes={mes} done={done} total={records.length} pct={pct} isComplete={isComplete} />
              {isMobile
                ? <MobileRecords records={records} obligaciones={scopedObligaciones} togglePago={canEdit ? togglePago : () => {}} setPagoFecha={canEdit ? setPagoFecha : () => {}} onEditObl={canEdit ? openEdit : undefined} />
                : <DesktopTable records={records} obligaciones={scopedObligaciones} togglePago={canEdit ? togglePago : () => {}} setPagoFecha={canEdit ? setPagoFecha : () => {}} onEditObl={canEdit ? openEdit : undefined} />
              }
            </div>
          )
        })}

        {pagos.length === 0 && (
          <div className="bg-surface border border-edge rounded-xl shadow-sm px-6 py-10 text-center">
            <div className="text-[14px] font-bold text-ink mb-1">Aún no tienes gastos fijos registrados</div>
            <div className="text-[12px] text-ink-3 mb-4">Agrega tus tarjetas, préstamos y servicios (luz, agua, mantenimiento…) para llevar el control de sus pagos cada mes.</div>
            {canEdit && (
              <button onClick={openAdd}
                className="h-9 px-4 rounded-lg text-[12px] font-bold bg-accent text-white hover:bg-accent-2 transition-all inline-flex items-center gap-1.5">
                <Plus size={14} /> Nuevo gasto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ObligacionFormModal({ editId, form, setForm, onSave, onDelete, onClose }: {
  editId: string | null
  form: ObligForm
  setForm: React.Dispatch<React.SetStateAction<ObligForm>>
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const inputCls = 'h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent'
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-edge">
        <div className="text-[16px] font-extrabold text-ink mb-4">{editId ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-ink-3">Nombre</label>
          <input className={inputCls} placeholder="Ej: Tarjeta Popular, Luz, Mantenimiento" autoFocus
            value={form.txt} onChange={e => setForm(f => ({ ...f, txt: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') onSave() }} />

          <label className="text-[11px] font-semibold text-ink-3 mt-1">Tipo</label>
          <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
            value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoObligacion }))}>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {!editId && (
            <>
              <label className="text-[11px] font-semibold text-ink-3 mt-1">Día de pago (opcional)</label>
              <input type="number" inputMode="numeric" min={1} max={31} className={inputCls} placeholder="Ej: 28"
                value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') onSave() }} />
              <span className="text-[10px] text-ink-3 -mt-0.5">Día del mes en que vence. Lo puedes ajustar después en cada pago.</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-5">
          {editId && (
            <button onClick={onDelete}
              className="h-8 px-3 text-[12px] font-bold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              Eliminar
            </button>
          )}
          <button onClick={onClose} className="ml-auto h-8 px-3 text-[12px] font-medium text-ink-2 border border-edge-mid rounded-lg hover:bg-surface-2">Cancelar</button>
          <button onClick={onSave} className="h-8 px-4 text-[12px] font-bold bg-accent text-white rounded-lg hover:bg-accent-2">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function MesHeader({ mes, done, total, pct, isComplete }: { mes: string; done: number; total: number; pct: number; isComplete: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 lg:px-5 py-3 bg-surface-2 border-b border-edge rounded-t-xl">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[14px] font-extrabold text-ink tracking-tight">{mesLabel(mes)}</span>
        {isComplete && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-light text-accent">Completo</span>}
      </div>
      <span className="text-[12px] text-ink-3">{done}/{total} · {pct}%</span>
      <div className="w-16 lg:w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isComplete ? 'var(--accent)' : '#B07820' }} />
      </div>
    </div>
  )
}

function CheckBtn({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button type="button"
      aria-label={done ? 'Marcar pago como pendiente' : 'Marcar pago como pagado'}
      title={done ? 'Marcar pago como pendiente' : 'Marcar pago como pagado'}
      onClick={onToggle}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0
        ${done ? 'bg-accent border-accent' : 'border-ink-4 hover:border-accent'}`}>
      {done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  )
}

function ConceptoCell({ ob, done, onEditObl }: { ob: Pick<Obligacion, 'id' | 'txt'>; done: boolean; onEditObl?: (id: string) => void }) {
  const cls = `font-medium text-ink ${done ? 'line-through text-ink-3' : ''}`
  if (!onEditObl) return <span className={cls}>{ob.txt}</span>
  return (
    <button type="button" onClick={() => onEditObl(ob.id)} title="Editar gasto fijo"
      className={`text-left hover:text-accent hover:underline transition-colors ${cls}`}>
      {ob.txt}
    </button>
  )
}

function MobileRecords({ records, obligaciones, togglePago, setPagoFecha, onEditObl }: {
  records: Pago[]; obligaciones: Obligacion[]; togglePago: (id: string) => void; setPagoFecha: (id: string, f: string) => void
  onEditObl?: (id: string) => void
}) {
  return (
    <div className="divide-y divide-edge">
      {records.map(p => {
        const ob = obligaciones.find(o => o.id === p.oblId) || ({ id: p.oblId, txt: '—', tipo: 'otro' } as Obligacion)
        const st = getFechaStatus(p.fecha)
        return (
          <div key={p.id} className={`flex items-start gap-3 px-4 py-3 ${p.done ? 'opacity-45' : ''}`}>
            <CheckBtn done={p.done} onToggle={() => togglePago(p.id)} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px]"><ConceptoCell ob={ob} done={p.done} onEditObl={onEditObl} /></div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${TIPO_BADGE[ob.tipo]}`}>
                  {TIPO_LABELS[ob.tipo]}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.done ? 'bg-accent-light text-accent' : 'bg-surface-3 text-ink-2'}`}>
                  {p.done ? 'Pagado' : 'Pendiente'}
                </span>
                {st === 'vencido' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">Vencido</span>}
                {st === 'hoy' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">Hoy</span>}
              </div>
              <input type="date" aria-label="Fecha de vencimiento"
                className="mt-1.5 text-[12px] text-ink-2 bg-transparent border-b border-dashed border-ink-4 outline-none focus:border-accent cursor-pointer"
                value={p.fecha || ''} onChange={e => setPagoFecha(p.id, e.target.value)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DesktopTable({ records, obligaciones, togglePago, setPagoFecha, onEditObl }: {
  records: Pago[]; obligaciones: Obligacion[]; togglePago: (id: string) => void; setPagoFecha: (id: string, f: string) => void
  onEditObl?: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-widest text-ink-3">
            <th className="px-5 py-2 text-left w-9"></th>
            <th className="px-5 py-2 text-left">Concepto</th>
            <th className="px-5 py-2 text-left">Tipo</th>
            <th className="px-5 py-2 text-left">Vence</th>
            <th className="px-5 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {records.map(p => {
            const ob = obligaciones.find(o => o.id === p.oblId) || ({ id: p.oblId, txt: '—', tipo: 'otro' } as Obligacion)
            const st = getFechaStatus(p.fecha)
            return (
              <tr key={p.id} className={`border-t border-edge hover:bg-surface-2 ${p.done ? 'opacity-45' : ''}`}>
                <td className="px-5 py-2.5"><CheckBtn done={p.done} onToggle={() => togglePago(p.id)} /></td>
                <td className="px-5 py-2.5"><ConceptoCell ob={ob} done={p.done} onEditObl={onEditObl} /></td>
                <td className="px-5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${TIPO_BADGE[ob.tipo]}`}>
                    {TIPO_LABELS[ob.tipo]}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <input type="date" aria-label="Fecha de vencimiento" className="text-[12px] text-ink-2 bg-transparent border-b border-dashed border-ink-4 outline-none focus:border-accent cursor-pointer"
                      value={p.fecha || ''} onChange={e => setPagoFecha(p.id, e.target.value)} />
                    {st === 'vencido' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">Vencido</span>}
                    {st === 'hoy' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">Hoy</span>}
                  </div>
                </td>
                <td className="px-5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.done ? 'bg-accent-light text-accent' : 'bg-surface-3 text-ink-2'}`}>
                    {p.done ? 'Pagado' : 'Pendiente'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
