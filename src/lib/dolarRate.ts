const BUY_KEY = 'dolar_rate_compra'
const SELL_KEY = 'dolar_rate_venta'
const DATE_KEY = 'dolar_rate_date'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export interface DolarRates {
  compra: number
  venta: number
}

const DEFAULTS: DolarRates = { compra: 60, venta: 61 }

export function getRates(): DolarRates {
  const c = parseFloat(localStorage.getItem(BUY_KEY) || '')
  const v = parseFloat(localStorage.getItem(SELL_KEY) || '')
  return {
    compra: isNaN(c) || c <= 0 ? DEFAULTS.compra : c,
    venta: isNaN(v) || v <= 0 ? DEFAULTS.venta : v,
  }
}

export function saveRates(rates: DolarRates) {
  localStorage.setItem(BUY_KEY, String(rates.compra))
  localStorage.setItem(SELL_KEY, String(rates.venta))
  localStorage.setItem(DATE_KEY, todayStr())
}

export function needsDailyPrompt(): boolean {
  return localStorage.getItem(DATE_KEY) !== todayStr()
}
