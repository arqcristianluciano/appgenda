import { Pencil, Trash2, MessageCircle, Copy } from 'lucide-react'
import type { CuentaBancaria } from '../../types'

function docLabel(c: CuentaBancaria): string | null {
  if (c.tipoCuenta === 'empresarial') return c.rnc ? `RNC: ${c.rnc}` : null
  return c.cedula ? `CI: ${c.cedula}` : null
}

function buildLocalText(c: CuentaBancaria): string {
  const doc = c.tipoCuenta === 'empresarial'
    ? (c.rnc ? `• RNC: ${c.rnc}` : '')
    : (c.cedula ? `• Cédula: ${c.cedula}` : '')
  return [
    `🏦 *${c.banco}*`,
    `• Titular: ${c.titular}`,
    doc,
    `• Cuenta ${c.tipo}: ${c.numero}`,
    c.telefono ? `• Tel: ${c.telefono}` : '',
    c.nota ? `• Nota: ${c.nota}` : '',
  ].filter(Boolean).join('\n')
}

function buildIntlText(c: CuentaBancaria): string {
  const doc = c.tipoCuenta === 'empresarial' && c.rnc
    ? `• RNC: ${c.rnc}`
    : c.cedula ? `• Cédula: ${c.cedula}` : ''
  return [
    `🌐 *Transferencia Internacional — ${c.banco}*`,
    `• Titular: ${c.titular}`,
    doc,
    c.pais ? `• País: ${c.pais}` : '',
    `• Banco: ${c.banco}`,
    c.direccionBanco ? `• Dirección: ${c.direccionBanco}` : '',
    c.swift ? `• SWIFT/BIC: ${c.swift}` : '',
    `• ${c.iban ? 'IBAN' : 'Nro. cuenta'}: ${c.iban || c.numero}`,
    c.bancoIntermediario ? `• Banco intermediario: ${c.bancoIntermediario}` : '',
    c.telefono ? `• Tel: ${c.telefono}` : '',
  ].filter(Boolean).join('\n')
}

const copy = (text: string) => navigator.clipboard.writeText(text)
const hasIntl = (c: CuentaBancaria) => !!(c.swift || c.iban || c.pais || c.direccionBanco)

interface Props {
  cuenta: CuentaBancaria
  onEdit: () => void
  onDelete: () => void
}

export default function CuentaCard({ cuenta: c, onEdit, onDelete }: Props) {
  const doc = docLabel(c)

  return (
    <div className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-bold text-ink">{c.banco}</div>
          <div className="text-[12px] text-ink-3 mt-0.5">{c.titular} · {c.tipo}</div>
          {doc && <div className="text-[11px] text-ink-4 mt-0.5">{doc}</div>}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink transition-all">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-ink-4 hover:text-red-500 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 bg-surface-2 rounded-lg px-3 py-2">
        <span className="text-[13px] font-mono text-ink tracking-wider flex-1">{c.numero}</span>
        <button onClick={() => copy(c.numero)} title="Copiar número"
          className="text-ink-3 hover:text-accent transition-colors">
          <Copy size={12} />
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <button onClick={() => copy(buildLocalText(c))}
          className="flex items-center gap-1.5 flex-1 h-8 rounded-lg bg-surface-2 border border-edge text-[11px] text-ink-3 hover:text-accent hover:border-accent justify-center transition-all">
          <Copy size={11} /> Copiar local
        </button>
        {hasIntl(c) && (
          <button onClick={() => copy(buildIntlText(c))}
            className="flex items-center gap-1.5 flex-1 h-8 rounded-lg bg-surface-2 border border-edge text-[11px] text-ink-3 hover:text-accent hover:border-accent justify-center transition-all">
            <Copy size={11} /> Copiar intl.
          </button>
        )}
        {c.telefono && (
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildLocalText(c))}`, '_blank')}
            title="Enviar por WhatsApp"
            className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center hover:opacity-80 transition-opacity flex-shrink-0">
            <MessageCircle size={13} />
          </button>
        )}
      </div>

      {c.nota && <div className="text-[11px] text-ink-3 mt-2 italic">{c.nota}</div>}
    </div>
  )
}
