import { useState } from 'react'
import CuentasBancarias from './CuentasBancarias'
import AccesosRemotos from './AccesosRemotos'
import ScopeFilter from '../../components/ScopeFilter'

type Tab = 'cuentas' | 'accesos'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'cuentas', label: 'Cuentas Bancarias', emoji: '🏦' },
  { id: 'accesos', label: 'Accesos Remotos',    emoji: '🖥️' },
]

export default function ViewDatos() {
  const [tab, setTab] = useState<Tab>('cuentas')

  return (
    <div>
      <div className="sticky -top-5 z-10 -mt-5 pt-5 pb-3 bg-surface-bg shadow-[0_4px_6px_-1px_var(--edge)]">
        <ScopeFilter />
        <div className="flex gap-1 bg-surface-2 border border-edge rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-[12px] font-semibold transition-all ${
              tab === t.id
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            <span className="hidden sm:inline">{t.emoji} </span>
            {t.label}
          </button>
        ))}
        </div>
      </div>

      {tab === 'cuentas' && <CuentasBancarias />}
      {tab === 'accesos' && <AccesosRemotos />}
    </div>
  )
}
