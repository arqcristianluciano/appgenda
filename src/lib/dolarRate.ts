const RATE_KEY = 'dolar_rate'
const RATE_DATE_KEY = 'dolar_rate_date'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function getRate(): number {
  const val = parseFloat(localStorage.getItem(RATE_KEY) || '')
  return isNaN(val) || val <= 0 ? 58 : val
}

export function saveRate(rate: number) {
  localStorage.setItem(RATE_KEY, String(rate))
  localStorage.setItem(RATE_DATE_KEY, todayStr())
}

export function needsDailyPrompt(): boolean {
  return localStorage.getItem(RATE_DATE_KEY) !== todayStr()
}
