export type Prestation = {
  roulement: Roulement[]
  id: string
  name: string
  amplitudeMin?: number
  tempsConduite?: number
  tempsActif?: number
  tempsReserve?: number
  tempsHLP?: number
}

export type Roulement = {
  serie: string
  semaine?: string
  jour?: string
  periode: string
  id?: string
}
