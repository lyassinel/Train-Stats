'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveAs } from 'file-saver'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Loader2 } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type Filters = {
  depot?: string
  date?: string
  serie?: string
}

type StatRow = {
  serie: string
  avgDrive: number
  avgActive: number
  avgReserve: number
  avgHLP: number
  avgAmplitude: string
  count: number
}

export default function StatsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Filtres sélectionnés
  const [filters1, setFilters1] = useState<Filters>({
    depot: searchParams.get('depot1') || undefined,
    date: searchParams.get('date1') || undefined,
    serie: searchParams.get('serie1') || undefined,
  })
  const [filters2, setFilters2] = useState<Filters>({
    depot: searchParams.get('depot2') || undefined,
    date: searchParams.get('date2') || undefined,
    serie: searchParams.get('serie2') || undefined,
  })

  // Données des listes déroulantes
  const [depots, setDepots] = useState<string[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [series, setSeries] = useState<string[]>([])

  // Données stats
  const [stats1, setStats1] = useState<StatRow[]>([])
  const [stats2, setStats2] = useState<StatRow[]>([])

  // États
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Met à jour l'URL
  const updateURL = () => {
    const params = new URLSearchParams()
    Object.entries(filters1).forEach(([k, v]) => v && params.set(`${k}1`, v))
    Object.entries(filters2).forEach(([k, v]) => v && params.set(`${k}2`, v))
    router.push(`?${params.toString()}`)
  }

  // Récupération initiale des dépôts
  useEffect(() => {
    fetch('/api/filters/depots')
      .then((res) => res.json())
      .then(setDepots)
  }, [])

  // Met à jour les dates disponibles quand dépôt change
  useEffect(() => {
    if (filters1.depot) {
      fetch(`/api/filters/dates?depot=${filters1.depot}`)
        .then((res) => res.json())
        .then(setDates)
    }
  }, [filters1.depot])

  // Met à jour les séries dispo quand date change
  useEffect(() => {
    if (filters1.date) {
      fetch(`/api/filters/series?depot=${filters1.depot}&date=${filters1.date}`)
        .then((res) => res.json())
        .then(setSeries)
    }
  }, [filters1.date])

  // Charge les stats
  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const [res1, res2] = await Promise.all([
        fetch(
          `/api/stats?depot=${filters1.depot || ''}&date=${filters1.date || ''}&serie=${filters1.serie || ''}`,
        ).then((r) => r.json()),
        fetch(
          `/api/stats?depot=${filters2.depot || ''}&date=${filters2.date || ''}&serie=${filters2.serie || ''}`,
        ).then((r) => r.json()),
      ])
      setStats1(res1)
      setStats2(res2)
    } catch (e) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Calcul des différences
  const compared = useMemo(() => {
    if (!stats1.length || !stats2.length) return []
    return stats1.map((row, i) => {
      const row2 = stats2[i] || {}
      const diff = (v1: number, v2: number) => (v2 ? ((v1 - v2) / v2) * 100 : 0)
      return {
        ...row,
        avgDrive2: row2.avgDrive || 0,
        diffDrive: diff(row.avgDrive, row2.avgDrive || 0),
      }
    })
  }, [stats1, stats2])

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Série', 'Conduite1', 'Conduite2', 'Diff %'],
      ...compared.map((r) => [r.serie, r.avgDrive, r.avgDrive2, r.diffDrive.toFixed(2) + '%']),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'stats.csv')
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Statistiques prestations</h1>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {[filters1, filters2].map((f, idx) => (
          <div key={idx} className="bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Jeu {idx + 1}</h2>
            <select
              className="w-full mb-2 p-2"
              value={f.depot || ''}
              onChange={(e) => setFilters1({ ...f, depot: e.target.value })}
            >
              <option value="">-- Dépôt --</option>
              {(Array.isArray(depots) ? depots : []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="w-full mb-2 p-2"
              value={f.date || ''}
              onChange={(e) => setFilters1({ ...f, date: e.target.value })}
            >
              <option value="">-- Date --</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="w-full p-2"
              value={f.serie || ''}
              onChange={(e) => setFilters1({ ...f, serie: e.target.value })}
            >
              <option value="">-- Série --</option>
              {series.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            updateURL()
            loadStats()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Appliquer
        </button>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded">
          Export CSV
        </button>
      </div>

      {/* Loading / Erreur */}
      {loading && (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" /> Chargement...
        </div>
      )}
      {error && <div className="text-red-600">{error}</div>}

      {/* Tableau */}
      {!loading && !error && compared.length > 0 && (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th>Série</th>
              <th>Conduite 1</th>
              <th>Conduite 2</th>
              <th>Diff %</th>
            </tr>
          </thead>
          <tbody>
            {compared.map((r, i) => (
              <tr key={i}>
                <td>{r.serie}</td>
                <td>{r.avgDrive}</td>
                <td>{r.avgDrive2}</td>
                <td className={r.diffDrive >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {r.diffDrive.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Mini Graph */}
      {compared.length > 0 && (
        <div className="mt-6">
          <Line
            data={{
              labels: compared.map((r) => r.serie),
              datasets: [
                { label: 'Jeu 1', data: compared.map((r) => r.avgDrive), borderColor: 'blue' },
                { label: 'Jeu 2', data: compared.map((r) => r.avgDrive2), borderColor: 'orange' },
              ],
            }}
          />
        </div>
      )}
    </div>
  )
}
