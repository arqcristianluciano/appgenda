import { useStore } from '../store/useStore'
import { getFechaStatus, mesLabel } from '../lib/merge'

export default function ViewFinanzas() {
  const { data, togglePago, setPagoFecha } = useStore()

  // Group pagos by mes
  const byMes: Record<string, typeof data.pagos> = {}
  data.pagos.forEach(p => {
    if (!byMes[p.mes]) byMes[p.mes] = []
    byMes[p.mes].push(p)
  })
  const meses = Object.keys(byMes).sort((a, b) => b.localeCompare(a))

  const allPend = data.pagos.filter(p => !p.done)
  const allDone = data.pagos.filter(p => p.done)
  const alertas = allPend.filter(p => getFechaStatus(p.fecha)).length

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { val: allPend.length, label: 'Pendientes', cls: 'text-red-600' },
          { val: allDone.length, label: 'Pagados', cls: 'text-[#2B5E3E]' },
          { val: alertas, label: 'Con alerta', cls: 'text-amber-600' },
          { val: data.obligaciones.length, label: 'Obligaciones', cls: '' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-black/[0.08] rounded-xl px-5 py-4 shadow-sm">
            <div className={`text-3xl font-extrabold tracking-tight leading-none ${s.cls}`}>{s.val}</div>
            <div className="text-[11px] text-gray-400 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly blocks */}
      <div className="flex flex-col gap-4">
        {meses.map(mes => {
          const records = byMes[mes]
          const done = records.filter(p => p.done).length
          const pct = records.length ? Math.round(done / records.length * 100) : 0
          const isComplete = records.every(p => p.done)

          return (
            <div key={mes} className={`bg-white border border-black/[0.08] rounded-xl overflow-hidden shadow-sm ${isComplete ? 'opacity-60' : ''}`}>
              {/* Month header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-black/[0.06]">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[14px] font-extrabold text-[#1C1A17] tracking-tight">{mesLabel(mes)}</span>
                  {isComplete && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F2EC] text-[#2B5E3E]">Completo</span>
                  )}
                </div>
                <span className="text-[12px] text-gray-400">{done}/{records.length} · {pct}%</span>
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isComplete ? '#2B5E3E' : '#B07820' }} />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <th className="px-5 py-2 text-left w-9"></th>
                      <th className="px-5 py-2 text-left">Concepto</th>
                      <th className="px-5 py-2 text-left">Tipo</th>
                      <th className="px-5 py-2 text-left">Vence</th>
                      <th className="px-5 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(p => {
                      const ob = data.obligaciones.find(o => o.id === p.oblId) || { txt: '—', tipo: '—' }
                      const st = getFechaStatus(p.fecha)
                      return (
                        <tr key={p.id} className={`border-t border-black/[0.05] hover:bg-gray-50 ${p.done ? 'opacity-45' : ''}`}>
                          <td className="px-5 py-2.5">
                            <button onClick={() => togglePago(p.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                ${p.done ? 'bg-[#2B5E3E] border-[#2B5E3E]' : 'border-gray-300 hover:border-[#2B5E3E]'}`}>
                              {p.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </td>
                          <td className={`px-5 py-2.5 font-medium ${p.done ? 'line-through text-gray-400' : ''}`}>{ob.txt}</td>
                          <td className="px-5 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ob.tipo === 'tarjeta' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {ob.tipo === 'tarjeta' ? 'Tarjeta' : 'Préstamo'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <input type="date"
                                className="text-[12px] text-gray-500 bg-transparent border-b border-dashed border-gray-300 outline-none focus:border-[#2B5E3E] cursor-pointer"
                                value={p.fecha || ''}
                                onChange={e => setPagoFecha(p.id, e.target.value)} />
                              {st === 'vencido' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">Vencido</span>}
                              {st === 'hoy' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">Hoy</span>}
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.done ? 'bg-[#E8F2EC] text-[#2B5E3E]' : 'bg-gray-100 text-gray-500'}`}>
                              {p.done ? 'Pagado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
