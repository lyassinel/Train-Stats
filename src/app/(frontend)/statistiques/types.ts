export type SerieOption = {
  serie: string
  id?: string | null
}

export type DepotOption = {
  id: string
  garefr: string
  code?: string | null
  seriesDepot?: SerieOption[] | null | undefined
}

export type DateOption = {
  id?: string
  date: string
}

export type Stats = {
  count: number
  countPrestations: number
  totalDrive: number
  totalReserve: number
  totalHLP: number
  totalActif: number
  totalAmplitude: number
  totalAmplitudePrestations: number
  avgDrive: number
  avgReserve: number
  avgHLP: number
  avgActif: number
  avgAmplitude: number
  avgAmplitudePrestations: number
  pctDrive: number
  pctReserve: number
  pctHLP: number
  pctActif: number
}
