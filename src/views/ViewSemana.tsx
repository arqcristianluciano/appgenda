import { useState } from 'react'
import { useStore } from '../store/useStore'
import { getFechaStatus } from '../lib/merge'
import { Plus } from 'lucide-react'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DIAS_S = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function getMondayOf(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ViewSemana() {
  const { data, addEvento, deleteEvento } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [evFecha, setEvFecha] = useState('')
  const [evTitulo, setEvTitulo] = useState('')
  const [evHora, setEvHora] = useState('')
  const [evNota, setEvNota] = useState('')

  const now = new Date()
  const mon = getMondayOf(now)
  const tod = todayStr()

  const sun2 = new Date(mon)
  sun2.setDate(mon.getDate() + 13)

  const handleAddEvent = () => {
    if (!evTitulo.trim() || !evFecha) return
    addEvento(evTitulo.trim(), evFecha, evHora, evNota)
    setEvTitulo(''); setEvFecha(''); setEvHora(''); setEvNota('')
    setShowForm(false)
  }

  const renderDayDesktop = (offset: number) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + offset)
    const iso = d.toISOString().split('T')[0]
    const isToday = iso === tod
    const evs = data.eventos.filter(e => e.fecha === iso)
    const tas = data.tareas.filter(t => t.fecha === iso)
    const pagos = (data.pagos || []).filter(p => !p.done && p.fecha === iso)

    return (
      <div key={iso} className={`border rounded-xl overflow-hidden shadow-sm transition-all
        ${isToday ? 'border-accent border-2 bg-accent-pale' : 'border-edge bg-surface hover:border-edge-strong'}`}>
        <div className={`px-2 py-2 text-center border-b ${isToday ? 'border-accent/30 bg-accent' : 'border-edge bg-surface-2'}`}>
          <div className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? 'text-white/70' : 'text-ink-2'}`}>{DIAS_S[d.getDay()]}</div>
          <div className={`font-serif text-xl leading-tight font-bold ${isToday ? 'text-white' : 'text-ink'}`}>{d.getDate()}</div>
        </div>
        <div className="p-1.5 flex flex-col gap-1">
          {evs.map(e => (
            <div key={e.id} onClick={() => deleteEvento(e.id)}
              className="text-[10px] font-semibold px-1.5 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-l-2 border-blue-500 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 leading-tight transition-colors">
              {e.titulo}{e.hora ? ` · ${e.hora}` : ''}
            </div>
          ))}
          {pagos.map(p => {
            const ob = data.obligaciones?.find(o => o.id === p.oblId) || { txt: 'Pago' }
            const st = getFechaStatus(p.fecha)
            const cls = st === 'vencido' ? 'bg-red-100 text-red-800 border-red-500 font-bold dark:bg-red-900/30 dark:text-red-400'
              : st === 'hoy' ? 'bg-amber-100 text-amber-800 border-amber-500 font-bold dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
            return (
              <div key={p.id} className={`text-[10px] font-semibold px-1.5 py-1 rounded border-l-2 leading-tight ${cls}`}>
                💳 {ob.txt.length > 14 ? ob.txt.slice(0, 14) + '…' : ob.txt}
              </div>
            )
          })}
          {tas.map(t => {
            const proj = t.proj ? data.proyectos.find(pr => pr.id === t.proj) : null
            return (
              <div key={t.id}
                className={`text-[10px] font-semibold px-1.5 py-1 rounded border-l-2 leading-tight ${t.done ? 'opacity-40 line-through' : ''}`}
                style={{ background: proj ? proj.color + '25' : 'var(--surface-3)', borderLeftColor: proj?.color || 'var(--ink-3)', color: proj?.color || 'var(--ink-2)' }}>
                {t.txt.slice(0, 18)}{t.txt.length > 18 ? '…' : ''}
              </div>
            )
          })}
          <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
            className="w-full h-5 rounded border border-dashed border-ink-4 text-ink-3 text-[11px] font-bold hover:border-accent hover:text-accent transition-colors">
            +
          </button>
        </div>
      </div>
    )
  }

  const renderDayMobile = (offset: number) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + offset)
    const iso = d.toISOString().split('T')[0]
    const isToday = iso === tod
    const isPast = iso < tod
    const evs = data.eventos.filter(e => e.fecha === iso)
    const tas = data.tareas.filter(t => t.fecha === iso)
    const pagos = (data.pagos || []).filter(p => !p.done && p.fecha === iso)
    const hasContent = evs.length > 0 || tas.length > 0 || pagos.length > 0

    return (
      <div key={iso} className={`flex gap-3 items-stretch ${isPast && !isToday ? 'opacity-50' : ''}`}>
        <div className="flex-shrink-0 w-[52px] flex flex-col items-center pt-1">
          <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-ink-3'}`}>
            {DIAS_S[d.getDay()]}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl leading-none mt-0.5
            ${isToday ? 'bg-accent text-white' : 'text-ink'}`}>
            {d.getDate()}
          </div>
        </div>

        <div className={`flex-1 min-h-[56px] rounded-2xl overflow-hidden mb-1
          ${isToday
            ? 'bg-accent-pale border border-accent/20'
            : hasContent
              ? 'bg-surface border border-edge'
              : 'bg-transparent border border-dashed border-edge'
          }`}>
          <div className="p-3 flex flex-col gap-2">
            {evs.map(e => (
              <div key={e.id} onClick={() => deleteEvento(e.id)}
                className="flex items-start gap-2 text-[13px] px-3 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-l-[3px] border-blue-400 active:opacity-70 leading-snug">
                <div className="flex-1">
                  <div className="font-medium">{e.titulo}</div>
                  {e.hora && <div className="text-[11px] text-blue-400 mt-0.5">{e.hora}</div>}
                </div>
              </div>
            ))}
            {pagos.map(p => {
              const ob = data.obligaciones?.find(o => o.id === p.oblId) || { txt: 'Pago' }
              const st = getFechaStatus(p.fecha)
              const cls = st === 'vencido' ? 'bg-red-50 text-red-700 border-red-400 dark:bg-red-900/20 dark:text-red-400'
                : st === 'hoy' ? 'bg-amber-50 text-amber-700 border-amber-400 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300'
              return (
                <div key={p.id} className={`text-[13px] px-3 py-2 rounded-xl border-l-[3px] leading-snug ${cls}`}>
                  💳 {ob.txt}
                </div>
              )
            })}
            {tas.map(t => {
              const proj = t.proj ? data.proyectos.find(pr => pr.id === t.proj) : null
              return (
                <div key={t.id}
                  className={`text-[13px] px-3 py-2 rounded-xl border-l-[3px] leading-snug ${t.done ? 'opacity-40 line-through' : ''}`}
                  style={{ background: proj ? proj.color + '18' : 'var(--surface-2)', borderLeftColor: proj?.color || 'var(--ink-4)', color: proj?.color || 'var(--ink-2)' }}>
                  {t.txt}
                </div>
              )
            })}
            {!hasContent && (
              <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
                className="flex items-center justify-center gap-1.5 text-ink-4 text-[12px] py-1 active:text-accent transition-colors">
                <Plus size={14} />
              </button>
            )}
            {hasContent && (
              <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
                className="flex items-center justify-center gap-1 text-ink-4 text-[11px] py-0.5 rounded-lg border border-dashed border-edge-mid active:border-accent active:text-accent transition-colors">
                <Plus size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] text-ink-3">
          {DIAS[mon.getDay()]} {mon.getDate()} – {DIAS[sun2.getDay()]} {sun2.getDate()} de {MESES[sun2.getMonth()]}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="h-8 px-4 rounded-xl text-[12px] font-bold border border-edge-strong bg-surface text-ink-2 hover:border-accent hover:text-accent active:bg-accent active:text-white transition-all">
          + Evento
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-edge rounded-2xl p-4 mb-5 shadow-sm">
          <div className="text-[13px] font-bold text-ink mb-3">Nuevo evento</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input className="h-10 px-3 bg-surface-2 border border-edge-mid rounded-xl text-[14px] text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              placeholder="Título…" value={evTitulo} onChange={e => setEvTitulo(e.target.value)} />
            <input type="date" className="h-10 px-3 bg-surface-2 border border-edge-mid rounded-xl text-[14px] text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              value={evFecha} onChange={e => setEvFecha(e.target.value)} />
            <input type="time" className="h-10 px-3 bg-surface-2 border border-edge-mid rounded-xl text-[14px] text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              value={evHora} onChange={e => setEvHora(e.target.value)} />
            <input className="h-10 px-3 bg-surface-2 border border-edge-mid rounded-xl text-[14px] text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              placeholder="Nota…" value={evNota} onChange={e => setEvNota(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 text-[13px] font-medium text-ink-2 border border-edge-mid rounded-xl hover:bg-surface-2 active:bg-surface-3">Cancelar</button>
            <button onClick={handleAddEvent} className="h-9 px-5 text-[13px] font-bold bg-accent text-white rounded-xl hover:bg-accent-2 active:bg-[#1E4A2E]">Guardar</button>
          </div>
        </div>
      )}

      <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 mb-2">Esta semana</div>
      <div className="lg:hidden flex flex-col gap-1.5 mb-4">
        {Array.from({ length: 7 }, (_, i) => renderDayMobile(i))}
      </div>
      <div className="hidden lg:grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }, (_, i) => renderDayDesktop(i))}
      </div>

      <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 mb-2 mt-2 lg:mt-4">Próxima semana</div>
      <div className="lg:hidden flex flex-col gap-1.5">
        {Array.from({ length: 7 }, (_, i) => renderDayMobile(i + 7))}
      </div>
      <div className="hidden lg:grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => renderDayDesktop(i + 7))}
      </div>
    </div>
  )
}
