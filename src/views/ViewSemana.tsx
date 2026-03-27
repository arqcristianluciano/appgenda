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

  // Desktop day card (compact, for 7-col grid)
  const renderDayDesktop = (offset: number) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + offset)
    const iso = d.toISOString().split('T')[0]
    const isToday = iso === tod
    const evs = data.eventos.filter(e => e.fecha === iso)
    const tas = data.tareas.filter(t => t.fecha === iso)
    const pagos = (data.pagos || []).filter(p => !p.done && p.fecha === iso)

    return (
      <div key={iso} className={`bg-white border rounded-xl overflow-hidden ${isToday ? 'border-[#2B5E3E]' : 'border-black/[0.08]'}`}>
        <div className={`px-2 py-2 text-center border-b ${isToday ? 'border-[#2B5E3E]/20 bg-[#F0F7F3]' : 'border-black/[0.06]'}`}>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{DIAS_S[d.getDay()]}</div>
          <div className={`font-serif text-xl leading-tight ${isToday ? 'text-[#2B5E3E]' : 'text-[#1C1A17]'}`}>{d.getDate()}</div>
        </div>
        <div className="p-1.5 flex flex-col gap-1">
          {evs.map(e => (
            <div key={e.id} onClick={() => deleteEvento(e.id)}
              className="text-[10px] px-1.5 py-1 rounded bg-blue-50 text-blue-700 border-l-2 border-blue-400 cursor-pointer hover:opacity-70 leading-tight">
              {e.titulo}{e.hora ? ` · ${e.hora}` : ''}
            </div>
          ))}
          {pagos.map(p => {
            const ob = data.obligaciones?.find(o => o.id === p.oblId) || { txt: 'Pago' }
            const st = getFechaStatus(p.fecha)
            const cls = st === 'vencido' ? 'bg-red-50 text-red-700 border-red-400'
              : st === 'hoy' ? 'bg-amber-50 text-amber-700 border-amber-400'
              : 'bg-blue-50 text-blue-700 border-blue-300'
            return (
              <div key={p.id} className={`text-[10px] px-1.5 py-1 rounded border-l-2 leading-tight ${cls}`}>
                💳 {ob.txt.length > 14 ? ob.txt.slice(0, 14) + '…' : ob.txt}
              </div>
            )
          })}
          {tas.map(t => {
            const proj = t.proj ? data.proyectos.find(pr => pr.id === t.proj) : null
            return (
              <div key={t.id}
                className={`text-[10px] px-1.5 py-1 rounded border-l-2 leading-tight ${t.done ? 'opacity-40 line-through' : ''}`}
                style={{ background: proj ? proj.color + '18' : '#f5f5f5', borderLeftColor: proj?.color || '#ccc', color: proj?.color || '#666' }}>
                {t.txt.slice(0, 18)}{t.txt.length > 18 ? '…' : ''}
              </div>
            )
          })}
          <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
            className="w-full h-5 rounded border border-dashed border-gray-300 text-gray-300 text-[11px] hover:border-[#2B5E3E] hover:text-[#2B5E3E] transition-colors">
            +
          </button>
        </div>
      </div>
    )
  }

  // Mobile day row (full-width, vertical timeline)
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
        {/* Date column */}
        <div className={`flex-shrink-0 w-[52px] flex flex-col items-center pt-1`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-[#2B5E3E]' : 'text-gray-400'}`}>
            {DIAS_S[d.getDay()]}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl leading-none mt-0.5
            ${isToday
              ? 'bg-[#2B5E3E] text-white'
              : 'text-[#1C1A17]'
            }`}>
            {d.getDate()}
          </div>
        </div>

        {/* Content card */}
        <div className={`flex-1 min-h-[56px] rounded-2xl overflow-hidden mb-1
          ${isToday
            ? 'bg-[#F0F7F3] border border-[#2B5E3E]/20'
            : hasContent
              ? 'bg-white border border-black/[0.06]'
              : 'bg-transparent border border-dashed border-black/[0.08]'
          }`}>
          <div className="p-3 flex flex-col gap-2">
            {evs.map(e => (
              <div key={e.id} onClick={() => deleteEvento(e.id)}
                className="flex items-start gap-2 text-[13px] px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border-l-[3px] border-blue-400 active:opacity-70 leading-snug">
                <div className="flex-1">
                  <div className="font-medium">{e.titulo}</div>
                  {e.hora && <div className="text-[11px] text-blue-400 mt-0.5">{e.hora}</div>}
                </div>
              </div>
            ))}
            {pagos.map(p => {
              const ob = data.obligaciones?.find(o => o.id === p.oblId) || { txt: 'Pago' }
              const st = getFechaStatus(p.fecha)
              const cls = st === 'vencido' ? 'bg-red-50 text-red-700 border-red-400'
                : st === 'hoy' ? 'bg-amber-50 text-amber-700 border-amber-400'
                : 'bg-blue-50 text-blue-700 border-blue-300'
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
                  style={{ background: proj ? proj.color + '18' : '#f5f5f5', borderLeftColor: proj?.color || '#ccc', color: proj?.color || '#666' }}>
                  {t.txt}
                </div>
              )
            })}
            {!hasContent && (
              <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
                className="flex items-center justify-center gap-1.5 text-gray-300 text-[12px] py-1 active:text-[#2B5E3E] transition-colors">
                <Plus size={14} />
              </button>
            )}
            {hasContent && (
              <button onClick={() => { setEvFecha(iso); setShowForm(true) }}
                className="flex items-center justify-center gap-1 text-gray-300 text-[11px] py-0.5 rounded-lg border border-dashed border-gray-200 active:border-[#2B5E3E] active:text-[#2B5E3E] transition-colors">
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
        <div className="text-[12px] text-gray-400">
          {DIAS[mon.getDay()]} {mon.getDate()} – {DIAS[sun2.getDay()]} {sun2.getDate()} de {MESES[sun2.getMonth()]}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="h-8 px-4 rounded-xl text-[12px] font-bold border border-black/[0.14] bg-white text-gray-600 hover:border-[#2B5E3E] hover:text-[#2B5E3E] active:bg-[#2B5E3E] active:text-white transition-all">
          + Evento
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-black/[0.08] rounded-2xl p-4 mb-5 shadow-sm">
          <div className="text-[13px] font-bold mb-3">Nuevo evento</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#2B5E3E] focus:ring-1 focus:ring-[#2B5E3E]/20"
              placeholder="Título…" value={evTitulo} onChange={e => setEvTitulo(e.target.value)} />
            <input type="date" className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#2B5E3E] focus:ring-1 focus:ring-[#2B5E3E]/20"
              value={evFecha} onChange={e => setEvFecha(e.target.value)} />
            <input type="time" className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#2B5E3E] focus:ring-1 focus:ring-[#2B5E3E]/20"
              value={evHora} onChange={e => setEvHora(e.target.value)} />
            <input className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#2B5E3E] focus:ring-1 focus:ring-[#2B5E3E]/20"
              placeholder="Nota…" value={evNota} onChange={e => setEvNota(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100">Cancelar</button>
            <button onClick={handleAddEvent} className="h-9 px-5 text-[13px] font-bold bg-[#2B5E3E] text-white rounded-xl hover:bg-[#3D7A54] active:bg-[#1E4A2E]">Guardar</button>
          </div>
        </div>
      )}

      {/* Week 1 */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-2">Esta semana</div>
      {/* Mobile: vertical timeline */}
      <div className="lg:hidden flex flex-col gap-1.5 mb-4">
        {Array.from({ length: 7 }, (_, i) => renderDayMobile(i))}
      </div>
      {/* Desktop: 7-col grid */}
      <div className="hidden lg:grid grid-cols-7 gap-1.5 mb-2">
        {Array.from({ length: 7 }, (_, i) => renderDayDesktop(i))}
      </div>

      {/* Week 2 */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-2 mt-2 lg:mt-4">Próxima semana</div>
      {/* Mobile: vertical timeline */}
      <div className="lg:hidden flex flex-col gap-1.5">
        {Array.from({ length: 7 }, (_, i) => renderDayMobile(i + 7))}
      </div>
      {/* Desktop: 7-col grid */}
      <div className="hidden lg:grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => renderDayDesktop(i + 7))}
      </div>
    </div>
  )
}
