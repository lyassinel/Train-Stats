'use client'

import { useEffect, useMemo, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import {
  getDepots,
  getDatesDepots,
  getPeriodsForSelection,
  getSeriesForSelection,
  getStatsForSelection,
} from './server/actions'
import { SelectionCard } from './components/SelectionCard'
import { ComparisonTable } from './components/ComparisonTable'
import type { DateOption, DepotOption, SerieOption, Stats } from './types'
import {
  diffStats,
  format,
  formatDateLabel,
  formatDuration,
  formatMinutes,
  formatPercent,
  sortPeriods,
} from './utils'

const MERGED_PERIODE_VALUE = 'merged'
const MERGED_PERIODE_LABEL = '1/6/A/*'

export default function Page() {
  const [depots, setDepots] = useState<DepotOption[]>([])

  const [datesA, setDatesA] = useState<DateOption[]>([])
  const [seriesA, setSeriesA] = useState<SerieOption[]>([])
  const [periodesA, setPeriodesA] = useState<string[]>([])
  const [selectedDepotA, setSelectedDepotA] = useState('')
  const [selectedDateA, setSelectedDateA] = useState('')
  const [selectedSerieA, setSelectedSerieA] = useState('all')
  const [selectedPeriodeA, setSelectedPeriodeA] = useState(MERGED_PERIODE_VALUE)
  const [statsA, setStatsA] = useState<Stats | null>(null)

  const [datesB, setDatesB] = useState<DateOption[]>([])
  const [seriesB, setSeriesB] = useState<SerieOption[]>([])
  const [periodesB, setPeriodesB] = useState<string[]>([])
  const [selectedDepotB, setSelectedDepotB] = useState('')
  const [selectedDateB, setSelectedDateB] = useState('')
  const [selectedSerieB, setSelectedSerieB] = useState('all')
  const [selectedPeriodeB, setSelectedPeriodeB] = useState(MERGED_PERIODE_VALUE)
  const [statsB, setStatsB] = useState<Stats | null>(null)


  useEffect(() => {
    ;(async () => {
      const depot = await getDepots()
      const sorted = [...depot].sort((a, b) => (a.garefr ?? '').localeCompare(b.garefr ?? ''))
      setDepots(sorted)
    })()
  }, [])

  useEffect(() => {
    if (!selectedDepotA) {
      setDatesA([])
      setSeriesA([])
      setPeriodesA([])
      setSelectedSerieA('all')
      return
    }
    ;(async () => {
      const datesDepot = await getDatesDepots(selectedDepotA)
      const sortedDates = [...datesDepot].sort((a, b) => b.date.localeCompare(a.date))
      setDatesA(sortedDates)
      setSeriesA([])
    })()
  }, [selectedDepotA, depots])

  useEffect(() => {
    if (!selectedDepotB) {
      setDatesB([])
      setSeriesB([])
      setPeriodesB([])
      setSelectedSerieB('all')
      return
    }
    ;(async () => {
      const datesDepot = await getDatesDepots(selectedDepotB)
      const sortedDates = [...datesDepot].sort((a, b) => b.date.localeCompare(a.date))
      setDatesB(sortedDates)
      setSeriesB([])
    })()
  }, [selectedDepotB, depots])

  useEffect(() => {
    if (selectedDepotA && selectedDateA) {
      ;(async () => {
        const series = await getSeriesForSelection(selectedDepotA, selectedDateA)
        const sortedSeries = [...series]
          .map((serie) => ({ serie }))
          .sort((a, b) => (a.serie ?? '').localeCompare(b.serie ?? ''))
        setSeriesA(sortedSeries)
      })()
    } else {
      setSeriesA([])
      setSelectedSerieA('all')
    }
  }, [selectedDepotA, selectedDateA])

  useEffect(() => {
    if (selectedDepotB && selectedDateB) {
      ;(async () => {
        const series = await getSeriesForSelection(selectedDepotB, selectedDateB)
        const sortedSeries = [...series]
          .map((serie) => ({ serie }))
          .sort((a, b) => (a.serie ?? '').localeCompare(b.serie ?? ''))
        setSeriesB(sortedSeries)
      })()
    } else {
      setSeriesB([])
      setSelectedSerieB('all')
    }
  }, [selectedDepotB, selectedDateB])

  useEffect(() => {
    if (selectedDepotA && selectedDateA) {
      ;(async () => {
        const periods = await getPeriodsForSelection(selectedDepotA, selectedDateA, selectedSerieA)
        const sorted = sortPeriods(periods)
        setPeriodesA(sorted)
        if (
          selectedPeriodeA !== 'all' &&
          selectedPeriodeA !== MERGED_PERIODE_VALUE &&
          !sorted.includes(selectedPeriodeA)
        ) {
          setSelectedPeriodeA(MERGED_PERIODE_VALUE)
        }
      })()
    } else {
      setPeriodesA([])
    }
  }, [selectedDepotA, selectedDateA, selectedSerieA])

  useEffect(() => {
    if (selectedDepotB && selectedDateB) {
      ;(async () => {
        const periods = await getPeriodsForSelection(selectedDepotB, selectedDateB, selectedSerieB)
        const sorted = sortPeriods(periods)
        setPeriodesB(sorted)
        if (
          selectedPeriodeB !== 'all' &&
          selectedPeriodeB !== MERGED_PERIODE_VALUE &&
          !sorted.includes(selectedPeriodeB)
        ) {
          setSelectedPeriodeB(MERGED_PERIODE_VALUE)
        }
      })()
    } else {
      setPeriodesB([])
    }
  }, [selectedDepotB, selectedDateB, selectedSerieB])

  useEffect(() => {
    if (selectedDepotA && selectedDateA) {
      ;(async () => {
        const stats = await getStatsForSelection(
          selectedDepotA,
          selectedDateA,
          selectedSerieA,
          selectedPeriodeA || 'all',
        )
        setStatsA(stats)
      })()
    } else {
      setStatsA(null)
    }
  }, [selectedDepotA, selectedDateA, selectedSerieA, selectedPeriodeA])

  useEffect(() => {
    if (selectedDepotB && selectedDateB) {
      ;(async () => {
        const stats = await getStatsForSelection(
          selectedDepotB,
          selectedDateB,
          selectedSerieB,
          selectedPeriodeB || 'all',
        )
        setStatsB(stats)
      })()
    } else {
      setStatsB(null)
    }
  }, [selectedDepotB, selectedDateB, selectedSerieB, selectedPeriodeB])

  const diff = useMemo(() => {
    if (!statsA || !statsB) return null
    return diffStats(statsA, statsB)
  }, [statsA, statsB])

  const rows = useMemo(() => {
    if (!statsA) return []
    const safeB = statsB
    const safeDiff = diff
    return [
      {
        key: 'count',
        label: 'Services',
        a: statsA.count,
        b: safeB?.count ?? 0,
        diff: safeDiff?.count ?? 0,
        fmtA: (n: number) => format(n, 0),
        fmtB: (n: number) => format(n, 0),
        fmtDiff: (n: number) => format(n, 0),
      },
      {
        key: 'countPrestations',
        label: 'Prestations',
        a: statsA.countPrestations,
        b: safeB?.countPrestations ?? 0,
        diff: safeDiff?.countPrestations ?? 0,
        fmtA: (n: number) => format(n, 0),
        fmtB: (n: number) => format(n, 0),
        fmtDiff: (n: number) => format(n, 0),
      },
      {
        key: 'avgDrive',
        label: 'Drive moyenne',
        a: statsA.avgDrive,
        b: safeB?.avgDrive ?? 0,
        diff: safeDiff?.avgDrive ?? 0,
        fmtA: formatDuration,
        fmtB: formatDuration,
        fmtDiff: formatMinutes,
      },
      {
        key: 'avgReserve',
        label: 'Reserve moyenne',
        a: statsA.avgReserve,
        b: safeB?.avgReserve ?? 0,
        diff: safeDiff?.avgReserve ?? 0,
        fmtA: formatMinutes,
        fmtB: formatMinutes,
        fmtDiff: formatMinutes,
      },
      {
        key: 'avgHLP',
        label: 'HLP moyenne',
        a: statsA.avgHLP,
        b: safeB?.avgHLP ?? 0,
        diff: safeDiff?.avgHLP ?? 0,
        fmtA: formatMinutes,
        fmtB: formatMinutes,
        fmtDiff: formatMinutes,
      },
      {
        key: 'avgActif',
        label: 'Actif moyenne',
        a: statsA.avgActif,
        b: safeB?.avgActif ?? 0,
        diff: safeDiff?.avgActif ?? 0,
        fmtA: formatDuration,
        fmtB: formatDuration,
        fmtDiff: formatMinutes,
      },
      {
        key: 'avgAmplitude',
        label: 'Amplitude moyenne (services)',
        a: statsA.avgAmplitude,
        b: safeB?.avgAmplitude ?? 0,
        diff: safeDiff?.avgAmplitude ?? 0,
        fmtA: formatDuration,
        fmtB: formatDuration,
        fmtDiff: formatMinutes,
      },
      {
        key: 'avgAmplitudePrestations',
        label: 'Amplitude moyenne (prestations)',
        a: statsA.avgAmplitudePrestations,
        b: safeB?.avgAmplitudePrestations ?? 0,
        diff: safeDiff?.avgAmplitudePrestations ?? 0,
        fmtA: formatDuration,
        fmtB: formatDuration,
        fmtDiff: formatMinutes,
      },
      {
        key: 'pctDrive',
        label: '% Drive',
        a: statsA.pctDrive,
        b: safeB?.pctDrive ?? 0,
        diff: safeDiff?.pctDrive ?? 0,
        fmtA: formatPercent,
        fmtB: formatPercent,
        fmtDiff: formatPercent,
      },
      {
        key: 'pctReserve',
        label: '% Res',
        a: statsA.pctReserve,
        b: safeB?.pctReserve ?? 0,
        diff: safeDiff?.pctReserve ?? 0,
        fmtA: formatPercent,
        fmtB: formatPercent,
        fmtDiff: formatPercent,
      },
      {
        key: 'pctHLP',
        label: '% HLP',
        a: statsA.pctHLP,
        b: safeB?.pctHLP ?? 0,
        diff: safeDiff?.pctHLP ?? 0,
        fmtA: formatPercent,
        fmtB: formatPercent,
        fmtDiff: formatPercent,
      },
      {
        key: 'pctActif',
        label: '% Actif',
        a: statsA.pctActif,
        b: safeB?.pctActif ?? 0,
        diff: safeDiff?.pctActif ?? 0,
        fmtA: formatPercent,
        fmtB: formatPercent,
        fmtDiff: formatPercent,
      },
    ]
  }, [statsA, statsB, diff])

const maxA = useMemo(() => Math.max(0, ...rows.map((r) => Math.abs(r.a))), [rows])
  const maxB = useMemo(() => Math.max(0, ...rows.map((r) => Math.abs(r.b))), [rows])
  const maxDiff = useMemo(() => Math.max(0, ...rows.map((r) => Math.abs(r.diff))), [rows])

  const sortedRows = rows

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-100">Statistiques de prestation</h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-400">
            Comparez rapidement deux selections pour comprendre les differences de temps et de
            charge.
          </p>
        </div>

        <div>
          <SelectionCard
            title="Selection principale"
            depots={depots}
            dates={datesA}
            series={seriesA}
            periodes={periodesA}
            selectedDepot={selectedDepotA}
            selectedDate={selectedDateA}
            selectedSerie={selectedSerieA}
            selectedPeriode={selectedPeriodeA}
            disableSerie={!selectedDepotA || !selectedDateA}
            onDepotChange={setSelectedDepotA}
            onDateChange={setSelectedDateA}
            onSerieChange={setSelectedSerieA}
            onPeriodeChange={setSelectedPeriodeA}
            mergedLabel={MERGED_PERIODE_LABEL}
            mergedValue={MERGED_PERIODE_VALUE}
            formatDateLabel={formatDateLabel}
          />

          <SelectionCard
            title="Selection de comparaison"
            depots={depots}
            dates={datesB}
            series={seriesB}
            periodes={periodesB}
            selectedDepot={selectedDepotB}
            selectedDate={selectedDateB}
            selectedSerie={selectedSerieB}
            selectedPeriode={selectedPeriodeB}
            disableSerie={!selectedDepotB || !selectedDateB}
            onDepotChange={setSelectedDepotB}
            onDateChange={setSelectedDateB}
            onSerieChange={setSelectedSerieB}
            onPeriodeChange={setSelectedPeriodeB}
            mergedLabel={MERGED_PERIODE_LABEL}
            mergedValue={MERGED_PERIODE_VALUE}
            formatDateLabel={formatDateLabel}
          />
        </div>

        <Separator />

        <ComparisonTable
          rows={sortedRows}
          statsA={statsA}
          statsB={statsB}
          depotCodeA={depots.find((d) => d.id === selectedDepotA)?.code ?? selectedDepotA}
          depotCodeB={depots.find((d) => d.id === selectedDepotB)?.code ?? selectedDepotB}
          maxA={maxA}
          maxB={maxB}
          maxDiff={maxDiff}
        />
      </div>
    </div>
  )
}
