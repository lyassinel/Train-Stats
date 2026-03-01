'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { Prestation } from '@/app/types/prestation'

/**
 * Fetch depots with their series list.
 */
export async function getDepots() {
  const payload = await getPayload({ config })
  try {
    const depot = await payload.find({
      collection: 'gares',
      where: { depot: { equals: true } },
      limit: 100,
      select: {
        garefr: true,
        code: true,
        seriesDepot: true,
      },
    })
    return depot.docs
  } catch (error) {
    console.error('Error fetching depots:', error)
    throw error
  }
}

/**
 * Fetch unique dates for a depot.
 */
export async function getDatesDepots(depotCode: string) {
  const payload = await getPayload({ config })
  try {
    const datesDepot = await payload.find({
      collection: 'prestations',
      where: { depot: { equals: depotCode } },
      limit: 10000,
      select: {
        date: true,
      },
    })
    const uniqueDates = Array.from(
      new Map(datesDepot.docs.map((item) => [item.date, item])).values(),
    )
    return uniqueDates
  } catch (error) {
    console.error('Error fetching dates for depot:', error)
    throw error
  }
}

type PrestationsWhere = {
  depot: { equals: string }
  date: { equals: string }
  'roulement.serie'?: { equals: string }
  'roulement.periode'?: { equals: string }
}

/**
 * Fetch prestations and filter them by serie for stats.
 */
export async function getPrestations(depotCode: string, date: string, serie: string) {
  const payload = await getPayload({ config })

  try {
    const count = 0

    const where: PrestationsWhere = {
      depot: { equals: depotCode },
      date: { equals: date },
    }
    if (serie && serie !== 'all') {
      where['roulement.serie'] = { equals: serie }
    }

    const prestations = await payload.find({
      collection: 'prestations',
      where,
      limit: 1000,
      select: {
        amplitudeMin: true,
        tempsConduite: true,
        tempsActif: true,
        tempsHLP: true,
        tempsReserve: true,
        roulement: true,
        name: true,
      },
    })

    const allowedPeriodes = ['A', '1', '6', '']

    const prestationsFiltrees: Prestation[] = prestations.docs
      .map((prestation) => {
        const roulementsValides = prestation.roulement?.filter((r) => {
          if (serie && serie !== 'all' && r.serie !== serie) return false
          return allowedPeriodes.includes(r.periode ?? '')
        })

        if (!roulementsValides || roulementsValides.length === 0) {
          return null
        }

        return {
          ...prestation,
          roulement: roulementsValides,
        }
      })
      .filter((item): item is Prestation => item !== null)

    return { prestationsFiltrees, count }
  } catch (error) {
    console.error('Error fetching prestations:', error)
    throw error
  }
}

type StatsResult = {
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

const MERGED_PERIODES = ['1', '6', 'A', '*']

const buildEmptyStats = (): StatsResult => ({
  count: 0,
  countPrestations: 0,
  totalDrive: 0,
  totalReserve: 0,
  totalHLP: 0,
  totalActif: 0,
  totalAmplitude: 0,
  totalAmplitudePrestations: 0,
  avgDrive: 0,
  avgReserve: 0,
  avgHLP: 0,
  avgActif: 0,
  avgAmplitude: 0,
  avgAmplitudePrestations: 0,
  pctDrive: 0,
  pctReserve: 0,
  pctHLP: 0,
  pctActif: 0,
})

const finalizeStats = (s: StatsResult): StatsResult => {
  const count = s.count
  s.avgDrive = count > 0 ? s.totalDrive / count : 0
  s.avgReserve = count > 0 ? s.totalReserve / count : 0
  s.avgHLP = count > 0 ? s.totalHLP / count : 0
  s.avgActif = count > 0 ? s.totalActif / count : 0
  s.avgAmplitude = count > 0 ? s.totalAmplitude / count : 0
  s.avgAmplitudePrestations =
    s.countPrestations > 0 ? s.totalAmplitudePrestations / s.countPrestations : 0
  const denom = s.totalAmplitude > 0 ? s.totalAmplitude : 0
  s.pctDrive = denom > 0 ? (s.totalDrive / denom) * 100 : 0
  s.pctReserve = denom > 0 ? (s.totalReserve / denom) * 100 : 0
  s.pctHLP = denom > 0 ? (s.totalHLP / denom) * 100 : 0
  s.pctActif = denom > 0 ? (s.totalActif / denom) * 100 : 0
  return s
}

const addPrestationToStats = (
  stats: StatsResult,
  prestation: Prestation,
  matchCount: number,
  countPrestation: boolean,
) => {
  if (matchCount > 0) {
    stats.count += matchCount
    stats.totalDrive += (prestation.tempsConduite ?? 0) * matchCount
    stats.totalReserve += (prestation.tempsReserve ?? 0) * matchCount
    stats.totalHLP += (prestation.tempsHLP ?? 0) * matchCount
    stats.totalActif += (prestation.tempsActif ?? 0) * matchCount
    stats.totalAmplitude += (prestation.amplitudeMin ?? 0) * matchCount
  }
  if (countPrestation) {
    stats.countPrestations += 1
    stats.totalAmplitudePrestations += prestation.amplitudeMin ?? 0
  }
}

const computeStats = (prestations: Prestation[], serie?: string, periode?: string): StatsResult => {
  const stats = buildEmptyStats()
  for (const prestation of prestations) {
    // services = number of matching roulements, prestations = each doc counted once
    const roulements = prestation.roulement ?? []
    const matches = roulements.filter((r) => {
      if (serie && serie !== 'all' && r.serie !== serie) return false
      if (periode && periode !== 'all') {
        if (periode === 'merged') return MERGED_PERIODES.includes(r.periode ?? '')
        return (r.periode ?? '') === periode
      }
      return true
    })
    if (matches.length > 0) {
      addPrestationToStats(stats, prestation, matches.length, true)
    } else if (
      (!serie || serie === 'all') &&
      (!periode || periode === 'all') &&
      roulements.length === 0
    ) {
      addPrestationToStats(stats, prestation, 1, true)
    }
  }
  return finalizeStats(stats)
}

/**
 * Compute stats for a (depot, date, serie, periode) selection.
 */
export async function getStatsForSelection(
  depotCode: string,
  date: string,
  serie: string,
  periode: string,
) {
  const payload = await getPayload({ config })
  const where: PrestationsWhere = {
    depot: { equals: depotCode },
    date: { equals: date },
  }
  if (serie && serie !== 'all') {
    where['roulement.serie'] = { equals: serie }
  }
  if (periode && periode !== 'all' && periode !== 'merged') {
    where['roulement.periode'] = { equals: periode }
  }

  try {
    const prestations = await payload.find({
      collection: 'prestations',
      where,
      limit: 2000,
      select: {
        amplitudeMin: true,
        tempsConduite: true,
        tempsActif: true,
        tempsHLP: true,
        tempsReserve: true,
        roulement: true,
        name: true,
      },
    })
    return computeStats(prestations.docs as Prestation[], serie, periode)
  } catch (error) {
    console.error('Error computing stats:', error)
    throw error
  }
}

/**
 * List existing periodes for a selection.
 */
export async function getPeriodsForSelection(depotCode: string, date: string, serie: string) {
  const payload = await getPayload({ config })
  const where: PrestationsWhere = {
    depot: { equals: depotCode },
    date: { equals: date },
  }
  if (serie && serie !== 'all') {
    where['roulement.serie'] = { equals: serie }
  }

  try {
    const prestations = await payload.find({
      collection: 'prestations',
      where,
      limit: 2000,
      select: {
        roulement: true,
      },
    })

    const set = new Set<string>()
    for (const p of prestations.docs as Prestation[]) {
      const roulements = p.roulement ?? []
      for (const r of roulements) {
        if (serie && serie !== 'all' && r.serie !== serie) continue
        const periode = r.periode ?? ''
        if (periode) set.add(periode)
      }
    }
    return Array.from(set)
  } catch (error) {
    console.error('Error fetching periods:', error)
    throw error
  }
}

/**
 * List available series for a (depot, date) selection.
 */
export async function getSeriesForSelection(depotCode: string, date: string) {
  const payload = await getPayload({ config })
  const where: PrestationsWhere = {
    depot: { equals: depotCode },
    date: { equals: date },
  }

  try {
    const prestations = await payload.find({
      collection: 'prestations',
      where,
      limit: 2000,
      select: {
        roulement: true,
      },
    })
    const set = new Set<string>()
    for (const p of prestations.docs as Prestation[]) {
      const roulements = p.roulement ?? []
      for (const r of roulements) {
        if (r.serie) set.add(r.serie)
      }
    }
    return Array.from(set)
  } catch (error) {
    console.error('Error fetching series:', error)
    throw error
  }
}
