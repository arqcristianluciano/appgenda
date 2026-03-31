import { useState } from 'react'
import CuentasBancarias from './CuentasBancarias'
import Contactos from './Contactos'
import AccesosRemotos from './AccesosRemotos'

type Tab = 'cuentas' | 'contactos' | 'accesos'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'cuentas',   label: 'Cuentas Bancarias', emoji: '🏦' },
  { id: 'contactos', label: 'Contactos',          emoji: '👤' },
  { id: 'accesos',   label: 'Accesos Remotos',    emoji: '🖥️' },
]

export default function ViewDatos() {
  const [tab, setTab] = useState<Tab>('cuentas')

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-surface-2 border border-edge rounded-xl p-1">
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

      {tab === 'cuentas'   && <CuentasBancarias />}
      {tab === 'contactos' && <Contactos />}
      {tab === 'accesos'   && <AccesosRemotos />}
    </div>
  )
}
