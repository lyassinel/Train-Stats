import { Stats } from './types'

const MERGED_PERIODES = ['1', '6', 'A', '*']

export const format = (n: number, decimals = 2) => {
  if (!Number.isFinite(n)) return '-'
  const factor = 10 ** decimals
  return String(Math.round(n * factor) / factor)
}

export const formatMinutes = (n: number) => `${format(n, 2)} min`
export const formatPercent = (n: number) => `${format(n, 1)} %`

export const formatDuration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return '-'
  const total = Math.round(Math.abs(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

export const formatDateLabel = (value: string) => {
  if (!value) return value
  const raw = value.split('T')[0]
  const parts = raw.split('-')
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts
    return `${dd}-${mm}-${yyyy}`
  }
  return value
}

export const diffStats = (a: Stats, b: Stats): Stats => ({
  count: b.count - a.count,
  countPrestations: b.countPrestations - a.countPrestations,
  totalDrive: b.totalDrive - a.totalDrive,
  totalReserve: b.totalReserve - a.totalReserve,
  totalHLP: b.totalHLP - a.totalHLP,
  totalActif: b.totalActif - a.totalActif,
  totalAmplitude: b.totalAmplitude - a.totalAmplitude,
  totalAmplitudePrestations: b.totalAmplitudePrestations - a.totalAmplitudePrestations,
  avgDrive: b.avgDrive - a.avgDrive,
  avgReserve: b.avgReserve - a.avgReserve,
  avgHLP: b.avgHLP - a.avgHLP,
  avgActif: b.avgActif - a.avgActif,
  avgAmplitude: b.avgAmplitude - a.avgAmplitude,
  avgAmplitudePrestations: b.avgAmplitudePrestations - a.avgAmplitudePrestations,
  pctDrive: b.pctDrive - a.pctDrive,
  pctReserve: b.pctReserve - a.pctReserve,
  pctHLP: b.pctHLP - a.pctHLP,
  pctActif: b.pctActif - a.pctActif,
})

export const sortPeriods = (periods: string[]) => {
  const order = new Map(MERGED_PERIODES.map((p, i) => [p, i]))
  return [...periods].sort((a, b) => {
    const aIdx = order.get(a)
    const bIdx = order.get(b)
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx
    if (aIdx !== undefined) return -1
    if (bIdx !== undefined) return 1
    return a.localeCompare(b)
  })
}
