import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import type { CuentaBancaria } from '../../types'

type FormData = Omit<CuentaBancaria, 'id'>

interface Props {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  onSave: () => void
  onCancel: () => void
  editing: boolean
}

const inp = 'w-full text-[13px] bg-surface border border-edge rounded-lg px-3 py-2 outline-none focus:border-accent text-ink'
const lbl = 'text-[10px] font-bold uppercase tracking-widest text-ink-3 block mb-1'

const BASE_FIELDS = [
  ['banco',    'Banco',                 'text', 'BHD, Popular…'      ],
  ['numero',   'Número de cuenta',      'text', 'XXXX XXXX XXXX'     ],
  ['titular',  'Titular',               'text', 'Nombre completo'    ],
  ['telefono', 'Teléfono (WhatsApp)',   'tel',  '+1 809 XXX XXXX'    ],
] as const

const INTL_FIELDS = [
  ['pais',               'País',                       'República Dominicana'   ],
  ['swift',              'SWIFT / BIC',                'BNPDDOMX'               ],
  ['iban',               'IBAN / Número internacional','RD00XXXX0000000000000'  ],
  ['bancoIntermediario', 'Banco intermediario',        'Banco corresponsal…'    ],
  ['direccionBanco',     'Dirección del banco',        'Calle, Ciudad, País'    ],
] as const

export default function FormCuenta({ form, setForm, onSave, onCancel, editing }: Props) {
  const [showIntl, setShowIntl] = useState(!!(form.swift || form.iban || form.pais))
  const set = <K extends keyof FormData>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const esEmpresarial = form.tipoCuenta === 'empresarial'

  return (
    <div className="bg-surface-2 border border-edge rounded-xl p-4 mb-4">
      <div className="flex gap-2 mb-3">
        {(['personal', 'empresarial'] as const).map(t => (
          <button key={t} onClick={() => setForm(p => ({ ...p, tipoCuenta: t }))}
            className={`flex-1 h-8 rounded-lg text-[12px] font-semibold border transition-all
              ${form.tipoCuenta === t ? 'bg-accent border-accent text-white' : 'border-edge text-ink-3 hover:border-accent hover:text-accent'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {BASE_FIELDS.map(([k, label, type, ph]) => (
          <div key={k}>
            <label className={lbl}>{label}</label>
            <input type={type} value={form[k] ?? ''} onChange={set(k)} placeholder={ph} className={inp} />
          </div>
        ))}

        <div>
          <label className={lbl}>{esEmpresarial ? 'RNC' : 'Cédula'}</label>
          <input type="text"
            value={esEmpresarial ? (form.rnc ?? '') : (form.cedula ?? '')}
            onChange={esEmpresarial ? set('rnc') : set('cedula')}
            placeholder={esEmpresarial ? '1-23-45678-9' : '000-0000000-0'}
            className={inp} />
        </div>

        <div>
          <label className={lbl}>Tipo de cuenta</label>
          <select value={form.tipo} onChange={set('tipo')} className={inp}>
            {['ahorro', 'corriente', 'nómina'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={lbl}>Nota</label>
          <input type="text" value={form.nota} onChange={set('nota')} placeholder="Opcional…" className={inp} />
        </div>
      </div>

      <button onClick={() => setShowIntl(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-accent mb-3 transition-colors">
        {showIntl ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Datos para transferencia internacional
      </button>

      {showIntl && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 border-t border-edge pt-3">
          {INTL_FIELDS.map(([k, label, ph]) => (
            <div key={k}>
              <label className={lbl}>{label}</label>
              <input type="text" value={form[k] ?? ''} onChange={set(k)} placeholder={ph} className={inp} />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink rounded-lg hover:bg-surface-3 transition-all">
          <X size={12} /> Cancelar
        </button>
        <button onClick={onSave}
          className="px-4 py-1.5 text-[12px] bg-accent text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
          {editing ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </div>
  )
}
