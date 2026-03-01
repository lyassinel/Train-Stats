'use client'

import React, { useMemo, useState } from 'react'
import { useDocumentForm, useWatchForm } from '@payloadcms/ui'
import { DepotStat, SerieStat } from '@/lib/prestations/types'

const roundTo = (n: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

const formatValue = (n?: number, decimals?: number, unit?: string) => {
  if (n === undefined || n === null || Number.isNaN(n)) return '-'
  const value = decimals === undefined ? n : roundTo(n, decimals)
  const text = `${value}`
  return unit ? `${text} ${unit}` : text
}

const formatMinutes = (n?: number) => formatValue(n, 2, 'min')
const formatPercent = (n?: number) => formatValue(n, 1, '%')
const formatCount = (n?: number) => formatValue(n, 0)

const getPeriods = (rows: { periode?: string }[], exclude: string[] = []) => {
  const set = new Set<string>()
  for (const r of rows) {
    if (r?.periode && !exclude.includes(r.periode)) set.add(r.periode)
  }
  return Array.from(set).sort()
}

const MERGED_PERIODS = ['1', '6', 'A', '*']

const sumSerie = (rows: SerieStat[]) => {
  const bySerie = new Map<string, SerieStat>()
  for (const r of rows) {
    if (!r.serie) continue
    const prev = bySerie.get(r.serie)
    if (!prev) {
      bySerie.set(r.serie, { ...r })
      continue
    }
    prev.count += r.count
    prev.totalDrive += r.totalDrive
    prev.totalReserve += r.totalReserve
    prev.totalHLP += r.totalHLP
    prev.totalActif += r.totalActif
    prev.totalAmplitude += r.totalAmplitude
  }
  return Array.from(bySerie.values())
}

const sumDepot = (rows: DepotStat[]) => {
  const total: DepotStat = {
    periode: '1/6/A/*',
    count: 0,
    totalDrive: 0,
    totalReserve: 0,
    totalHLP: 0,
    totalActif: 0,
    totalAmplitude: 0,
  }
  for (const r of rows) {
    total.count += r.count
    total.totalDrive += r.totalDrive
    total.totalReserve += r.totalReserve
    total.totalHLP += r.totalHLP
    total.totalActif += r.totalActif
    total.totalAmplitude += r.totalAmplitude
  }
  return total
}

const withDerived = <
  T extends {
    count: number
    totalDrive: number
    totalReserve: number
    totalHLP: number
    totalActif: number
    totalAmplitude: number
  },
>(
  s: T,
) => {
  const avgDrive = s.count > 0 ? s.totalDrive / s.count : 0
  const avgReserve = s.count > 0 ? s.totalReserve / s.count : 0
  const avgHLP = s.count > 0 ? s.totalHLP / s.count : 0
  const avgActif = s.count > 0 ? s.totalActif / s.count : 0
  const avgAmplitude = s.count > 0 ? s.totalAmplitude / s.count : 0
  const denom = s.totalAmplitude > 0 ? s.totalAmplitude : 0
  const pctDrive = denom > 0 ? (s.totalDrive / denom) * 100 : 0
  const pctReserve = denom > 0 ? (s.totalReserve / denom) * 100 : 0
  const pctHLP = denom > 0 ? (s.totalHLP / denom) * 100 : 0
  const pctActif = denom > 0 ? (s.totalActif / denom) * 100 : 0

  return {
    ...s,
    avgDrive,
    avgReserve,
    avgHLP,
    avgActif,
    avgAmplitude,
    pctDrive,
    pctReserve,
    pctHLP,
    pctActif,
  }
}

const Tabs: React.FC<{
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}> = ({ tabs, active, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: active === t.id ? '#111827' : '#fff',
            color: active === t.id ? '#fff' : '#111827',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

type Cell = { display: React.ReactNode; sortValue?: string | number }
type TableRow = Record<string, Cell>
type Column = { key: string; label: string; sortable?: boolean }

const Table: React.FC<{
  columns: Column[]
  rows: TableRow[]
}> = ({ columns, rows }) => {
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const aCell = a[sortKey]
      const bCell = b[sortKey]
      const aValue = aCell?.sortValue ?? aCell?.display
      const bValue = bCell?.sortValue ?? bCell?.display
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * dir
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * dir
    })
  }, [rows, sortDir, sortKey])

  const onSort = (key: string, sortable?: boolean) => {
    if (!sortable) return
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const iconFor = (key: string, sortable?: boolean) => {
    if (!sortable) return null
    if (sortKey !== key) return '?'
    return sortDir === 'asc' ? '^' : 'v'
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderBottom: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                  cursor: c.sortable ? 'pointer' : 'default',
                }}
                onClick={() => onSort(c.key, c.sortable)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {c.label}
                  {c.sortable && (
                    <span
                      style={{ fontSize: 10, color: sortKey === c.key ? '#111827' : '#9ca3af' }}
                    >
                      {iconFor(c.key, c.sortable)}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td style={{ padding: 10 }} colSpan={columns.length}>
                Aucune donnée.
              </td>
            </tr>
          ) : (
            sortedRows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td
                    key={`${i}-${c.key}`}
                    style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}
                  >
                    {r[c.key]?.display ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
const SerieSection: React.FC<{ rows: SerieStat[] }> = ({ rows }) => {
  const periods = useMemo(() => getPeriods(rows), [rows])
  const [active, setActive] = useState(periods[0] ?? '')

  const tabs = periods.map((p) => ({
    id: p,
    label: `Periode ${p}`,
  }))

  const data = rows.filter((r) => r.periode === active)
  const columns: Column[] = [
    { key: 'serie', label: 'Serie', sortable: true },
    { key: 'count', label: 'Occ.', sortable: true },
    { key: 'totalDrive', label: 'Drive', sortable: true },
    { key: 'totalReserve', label: 'Res', sortable: true },
    { key: 'totalHLP', label: 'HLP', sortable: true },
    { key: 'totalActif', label: 'Actif', sortable: true },
    { key: 'totalAmplitude', label: 'Amp', sortable: true },
    { key: 'avgDrive', label: 'mDrive', sortable: true },
    { key: 'avgReserve', label: 'mRes', sortable: true },
    { key: 'avgHLP', label: 'mHLP', sortable: true },
    { key: 'avgActif', label: 'mActif', sortable: true },
    { key: 'avgAmplitude', label: 'mAmp', sortable: true },
    { key: 'pctDrive', label: '%Drive', sortable: true },
    { key: 'pctReserve', label: '%Res', sortable: true },
    { key: 'pctHLP', label: '%HLP', sortable: true },
    { key: 'pctActif', label: '%Actif', sortable: true },
  ]
  const tableRows: TableRow[] = data.map((r) => ({
    serie: { display: r.serie ?? '-' },
    count: { display: formatCount(r.count), sortValue: r.count },
    totalDrive: { display: formatMinutes(r.totalDrive), sortValue: r.totalDrive },
    totalReserve: { display: formatMinutes(r.totalReserve), sortValue: r.totalReserve },
    totalHLP: { display: formatMinutes(r.totalHLP), sortValue: r.totalHLP },
    totalActif: { display: formatMinutes(r.totalActif), sortValue: r.totalActif },
    totalAmplitude: { display: formatMinutes(r.totalAmplitude), sortValue: r.totalAmplitude },
    avgDrive: { display: formatMinutes(r.avgDrive), sortValue: r.avgDrive },
    avgReserve: { display: formatMinutes(r.avgReserve), sortValue: r.avgReserve },
    avgHLP: { display: formatMinutes(r.avgHLP), sortValue: r.avgHLP },
    avgActif: { display: formatMinutes(r.avgActif), sortValue: r.avgActif },
    avgAmplitude: { display: formatMinutes(r.avgAmplitude), sortValue: r.avgAmplitude },
    pctDrive: { display: formatPercent(r.pctDrive), sortValue: r.pctDrive },
    pctReserve: { display: formatPercent(r.pctReserve), sortValue: r.pctReserve },
    pctHLP: { display: formatPercent(r.pctHLP), sortValue: r.pctHLP },
    pctActif: { display: formatPercent(r.pctActif), sortValue: r.pctActif },
  }))

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <Table columns={columns} rows={tableRows} />
    </div>
  )
}

const SerieMergedSection: React.FC<{ rows: SerieStat[] }> = ({ rows }) => {
  const merged = useMemo(
    () => sumSerie(rows.filter((r) => MERGED_PERIODS.includes(r.periode))),
    [rows],
  )
  const columns: Column[] = [
    { key: 'serie', label: 'Serie', sortable: true },
    { key: 'count', label: 'Occ.', sortable: true },
    { key: 'totalDrive', label: 'Drive', sortable: true },
    { key: 'totalReserve', label: 'Res', sortable: true },
    { key: 'totalHLP', label: 'HLP', sortable: true },
    { key: 'totalActif', label: 'Actif', sortable: true },
    { key: 'totalAmplitude', label: 'Amp', sortable: true },
    { key: 'avgDrive', label: 'mDrive', sortable: true },
    { key: 'avgReserve', label: 'mRes', sortable: true },
    { key: 'avgHLP', label: 'mHLP', sortable: true },
    { key: 'avgActif', label: 'mActif', sortable: true },
    { key: 'avgAmplitude', label: 'mAmp', sortable: true },
    { key: 'pctDrive', label: '%Drive', sortable: true },
    { key: 'pctReserve', label: '%Res', sortable: true },
    { key: 'pctHLP', label: '%HLP', sortable: true },
    { key: 'pctActif', label: '%Actif', sortable: true },
  ]
  const tableRows: TableRow[] = merged.map((r) => {
    const d = withDerived(r)
    return {
      serie: { display: d.serie ?? '-' },
      count: { display: formatCount(d.count), sortValue: d.count },
      totalDrive: { display: formatMinutes(d.totalDrive), sortValue: d.totalDrive },
      totalReserve: { display: formatMinutes(d.totalReserve), sortValue: d.totalReserve },
      totalHLP: { display: formatMinutes(d.totalHLP), sortValue: d.totalHLP },
      totalActif: { display: formatMinutes(d.totalActif), sortValue: d.totalActif },
      totalAmplitude: { display: formatMinutes(d.totalAmplitude), sortValue: d.totalAmplitude },
      avgDrive: { display: formatMinutes(d.avgDrive), sortValue: d.avgDrive },
      avgReserve: { display: formatMinutes(d.avgReserve), sortValue: d.avgReserve },
      avgHLP: { display: formatMinutes(d.avgHLP), sortValue: d.avgHLP },
      avgActif: { display: formatMinutes(d.avgActif), sortValue: d.avgActif },
      avgAmplitude: { display: formatMinutes(d.avgAmplitude), sortValue: d.avgAmplitude },
      pctDrive: { display: formatPercent(d.pctDrive), sortValue: d.pctDrive },
      pctReserve: { display: formatPercent(d.pctReserve), sortValue: d.pctReserve },
      pctHLP: { display: formatPercent(d.pctHLP), sortValue: d.pctHLP },
      pctActif: { display: formatPercent(d.pctActif), sortValue: d.pctActif },
    }
  })

  return <Table columns={columns} rows={tableRows} />
}

const DepotSection: React.FC<{ rows: DepotStat[] }> = ({ rows }) => {
  const periods = useMemo(() => getPeriods(rows), [rows])
  const [active, setActive] = useState(periods[0] ?? '')

  const tabs = periods.map((p) => ({
    id: p,
    label: `Periode ${p}`,
  }))

  const data = rows.filter((r) => r.periode === active)
  const columns: Column[] = [
    { key: 'count', label: 'Occ.', sortable: true },
    { key: 'totalDrive', label: 'Drive', sortable: true },
    { key: 'totalReserve', label: 'Res', sortable: true },
    { key: 'totalHLP', label: 'HLP', sortable: true },
    { key: 'totalActif', label: 'Actif', sortable: true },
    { key: 'totalAmplitude', label: 'Amp', sortable: true },
    { key: 'avgDrive', label: 'mDrive', sortable: true },
    { key: 'avgReserve', label: 'mRes', sortable: true },
    { key: 'avgHLP', label: 'mHLP', sortable: true },
    { key: 'avgActif', label: 'mActif', sortable: true },
    { key: 'avgAmplitude', label: 'mAmp', sortable: true },
    { key: 'pctDrive', label: '%Drive', sortable: true },
    { key: 'pctReserve', label: '%Res', sortable: true },
    { key: 'pctHLP', label: '%HLP', sortable: true },
    { key: 'pctActif', label: '%Actif', sortable: true },
  ]
  const tableRows: TableRow[] = data.map((r) => ({
    count: { display: formatCount(r.count), sortValue: r.count },
    totalDrive: { display: formatMinutes(r.totalDrive), sortValue: r.totalDrive },
    totalReserve: { display: formatMinutes(r.totalReserve), sortValue: r.totalReserve },
    totalHLP: { display: formatMinutes(r.totalHLP), sortValue: r.totalHLP },
    totalActif: { display: formatMinutes(r.totalActif), sortValue: r.totalActif },
    totalAmplitude: { display: formatMinutes(r.totalAmplitude), sortValue: r.totalAmplitude },
    avgDrive: { display: formatMinutes(r.avgDrive), sortValue: r.avgDrive },
    avgReserve: { display: formatMinutes(r.avgReserve), sortValue: r.avgReserve },
    avgHLP: { display: formatMinutes(r.avgHLP), sortValue: r.avgHLP },
    avgActif: { display: formatMinutes(r.avgActif), sortValue: r.avgActif },
    avgAmplitude: { display: formatMinutes(r.avgAmplitude), sortValue: r.avgAmplitude },
    pctDrive: { display: formatPercent(r.pctDrive), sortValue: r.pctDrive },
    pctReserve: { display: formatPercent(r.pctReserve), sortValue: r.pctReserve },
    pctHLP: { display: formatPercent(r.pctHLP), sortValue: r.pctHLP },
    pctActif: { display: formatPercent(r.pctActif), sortValue: r.pctActif },
  }))

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <Table columns={columns} rows={tableRows} />
    </div>
  )
}

const DepotMergedSection: React.FC<{ rows: DepotStat[] }> = ({ rows }) => {
  const merged = useMemo(
    () => sumDepot(rows.filter((r) => MERGED_PERIODS.includes(r.periode))),
    [rows],
  )
  const d = withDerived(merged)
  const columns: Column[] = [
    { key: 'count', label: 'Occ.', sortable: true },
    { key: 'totalDrive', label: 'Drive', sortable: true },
    { key: 'totalReserve', label: 'Res', sortable: true },
    { key: 'totalHLP', label: 'HLP', sortable: true },
    { key: 'totalActif', label: 'Actif', sortable: true },
    { key: 'totalAmplitude', label: 'Amp', sortable: true },
    { key: 'avgDrive', label: 'mDrive', sortable: true },
    { key: 'avgReserve', label: 'mRes', sortable: true },
    { key: 'avgHLP', label: 'mHLP', sortable: true },
    { key: 'avgActif', label: 'mActif', sortable: true },
    { key: 'avgAmplitude', label: 'mAmp', sortable: true },
    { key: 'pctDrive', label: '%Drive', sortable: true },
    { key: 'pctReserve', label: '%Res', sortable: true },
    { key: 'pctHLP', label: '%HLP', sortable: true },
    { key: 'pctActif', label: '%Actif', sortable: true },
  ]
  const tableRows: TableRow[] = [
    {
      count: { display: formatCount(d.count), sortValue: d.count },
      totalDrive: { display: formatMinutes(d.totalDrive), sortValue: d.totalDrive },
      totalReserve: { display: formatMinutes(d.totalReserve), sortValue: d.totalReserve },
      totalHLP: { display: formatMinutes(d.totalHLP), sortValue: d.totalHLP },
      totalActif: { display: formatMinutes(d.totalActif), sortValue: d.totalActif },
      totalAmplitude: { display: formatMinutes(d.totalAmplitude), sortValue: d.totalAmplitude },
      avgDrive: { display: formatMinutes(d.avgDrive), sortValue: d.avgDrive },
      avgReserve: { display: formatMinutes(d.avgReserve), sortValue: d.avgReserve },
      avgHLP: { display: formatMinutes(d.avgHLP), sortValue: d.avgHLP },
      avgActif: { display: formatMinutes(d.avgActif), sortValue: d.avgActif },
      avgAmplitude: { display: formatMinutes(d.avgAmplitude), sortValue: d.avgAmplitude },
      pctDrive: { display: formatPercent(d.pctDrive), sortValue: d.pctDrive },
      pctReserve: { display: formatPercent(d.pctReserve), sortValue: d.pctReserve },
      pctHLP: { display: formatPercent(d.pctHLP), sortValue: d.pctHLP },
      pctActif: { display: formatPercent(d.pctActif), sortValue: d.pctActif },
    },
  ]

  return <Table columns={columns} rows={tableRows} />
}

const StatsTabs: React.FC = () => {
  const { getDataByPath } = useDocumentForm()
  useWatchForm()

  const serieStats = getDataByPath('statsSeriePeriode') as SerieStat[] | undefined
  const depotStats = getDataByPath('statsDepotPeriode') as DepotStat[] | undefined

  const series = Array.isArray(serieStats) ? serieStats : []
  const depot = Array.isArray(depotStats) ? depotStats : []

  const [activeTop, setActiveTop] = useState<'seriesMerged' | 'depotMerged' | 'series' | 'depot'>(
    'seriesMerged',
  )

  return (
    <div style={{ marginTop: 8 }}>
      <Tabs
        tabs={[
          { id: 'seriesMerged', label: 'Séries (1/6/A/*)' },
          { id: 'depotMerged', label: 'Dépôt (1/6/A/*)' },
          { id: 'series', label: 'Séries / autres périodes' },
          { id: 'depot', label: 'Dépôt / autres périodes' },
        ]}
        active={activeTop}
        onChange={(id) => setActiveTop(id as 'seriesMerged' | 'depotMerged' | 'series' | 'depot')}
      />

      {activeTop === 'seriesMerged' && <SerieMergedSection rows={series} />}
      {activeTop === 'depotMerged' && <DepotMergedSection rows={depot} />}
      {activeTop === 'series' && <SerieSection rows={series} />}
      {activeTop === 'depot' && <DepotSection rows={depot} />}
    </div>
  )
}

export default StatsTabs
