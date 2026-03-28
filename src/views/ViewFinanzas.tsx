import { useStore } from '../store/useStore'
import { getFechaStatus, mesLabel } from '../lib/merge'

export default function ViewFinanzas() {
  const { data, togglePago, setPagoFecha } = useStore()

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { val: allPend.length, label: 'Pendientes', cls: 'text-red-600 dark:text-red-400' },
          { val: allDone.length, label: 'Pagados', cls: 'text-accent' },
          { val: alertas, label: 'Con alerta', cls: 'text-amber-600 dark:text-amber-400' },
          { val: data.obligaciones.length, label: 'Obligaciones', cls: '' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
            <div className={`text-3xl font-extrabold tracking-tight leading-none ${s.cls}`}>{s.val}</div>
            <div className="text-[11px] text-ink-3 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {meses.map(mes => {
          const records = byMes[mes]
          const done = records.filter(p => p.done).length
          const pct = records.length ? Math.round(done / records.length * 100) : 0
          const isComplete = records.every(p => p.done)

          return (
            <div key={mes} className={`bg-surface border border-edge rounded-xl overflow-hidden shadow-sm ${isComplete ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 px-5 py-3 bg-surface-2 border-b border-edge">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[14px] font-extrabold text-ink tracking-tight">{mesLabel(mes)}</span>
                  {isComplete && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-light text-accent">Completo</span>
                  )}
                </div>
                <span className="text-[12px] text-ink-3">{done}/{records.length} · {pct}%</span>
                <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isComplete ? 'var(--accent)' : '#B07820' }} />
                </div>
              </div>

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
                      const ob = data.obligaciones.find(o => o.id === p.oblId) || { txt: '—', tipo: '—' }
                      const st = getFechaStatus(p.fecha)
                      return (
                        <tr key={p.id} className={`border-t border-edge hover:bg-surface-2 ${p.done ? 'opacity-45' : ''}`}>
                          <td className="px-5 py-2.5">
                            <button onClick={() => togglePago(p.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                ${p.done ? 'bg-accent border-accent' : 'border-ink-4 hover:border-accent'}`}>
                              {p.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </td>
                          <td className={`px-5 py-2.5 font-medium text-ink ${p.done ? 'line-through text-ink-3' : ''}`}>{ob.txt}</td>
                          <td className="px-5 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ob.tipo === 'tarjeta' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-surface-3 text-ink-2'}`}>
                              {ob.tipo === 'tarjeta' ? 'Tarjeta' : 'Préstamo'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <input type="date"
                                className="text-[12px] text-ink-2 bg-transparent border-b border-dashed border-ink-4 outline-none focus:border-accent cursor-pointer"
                                value={p.fecha || ''}
                                onChange={e => setPagoFecha(p.id, e.target.value)} />
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
