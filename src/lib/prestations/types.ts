export type DepotStat = {
  periode: string
  count: number
  totalDrive: number
  totalReserve: number
  totalHLP: number
  totalActif: number
  totalAmplitude: number
  avgDrive?: number
  avgReserve?: number
  avgHLP?: number
  avgActif?: number
  avgAmplitude?: number
  pctDrive?: number
  pctReserve?: number
  pctHLP?: number
  pctActif?: number
}

export type SerieStat = {
  serie: string
} & DepotStat

export type SeriesPeriodStats = {
  avgAmplitudePrestations?: number
  countPrestations: number
  totalAmplitudePrestations: number
} & SerieStat

export type PeriodStats = {
  totalAmplitudePrestations: number
  countPrestations: number
} & DepotStat

export type ImportDoc = {
  id: string | number
  filename?: string
  etat?: string
}
