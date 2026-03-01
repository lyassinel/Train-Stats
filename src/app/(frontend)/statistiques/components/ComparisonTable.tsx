'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Stats } from '../types'

type Row = {
  key: string
  label: string
  a: number
  b: number
  diff: number
  fmtA: (n: number) => string
  fmtB: (n: number) => string
  fmtDiff: (n: number) => string
}

type Props = {
  rows: Row[]
  statsA: Stats | null
  statsB: Stats | null
  depotCodeA: string
  depotCodeB: string
  maxA: number
  maxB: number
  maxDiff: number
}

const valueScaleClass = (value: number, max: number) => {
  if (!Number.isFinite(value) || max <= 0) return ''
  const ratio = Math.abs(value) / max
  if (ratio >= 0.66) return 'bg-sky-100 text-sky-900'
  if (ratio >= 0.33) return 'bg-sky-50 text-sky-800'
  return 'text-sky-800'
}

const diffScaleClass = (value: number, max: number) => {
  if (!Number.isFinite(value) || max <= 0) return ''
  const ratio = Math.abs(value) / max
  if (value > 0) {
    if (ratio >= 0.66) return 'bg-emerald-100 text-emerald-900'
    if (ratio >= 0.33) return 'bg-emerald-50 text-emerald-800'
    return 'text-emerald-800'
  }
  if (value < 0) {
    if (ratio >= 0.66) return 'bg-rose-100 text-rose-900'
    if (ratio >= 0.33) return 'bg-rose-50 text-rose-800'
    return 'text-rose-800'
  }
  return 'text-slate-500'
}

/**
 * Comparison table with shadcn UI Table.
 */
export const ComparisonTable = ({
  rows,
  statsA,
  statsB,
  depotCodeA,
  depotCodeB,
  maxA,
  maxB,
  maxDiff,
}: Props) => {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-slate-800">Comparaison des temps</div>
        {!statsA ? (
          <div className="text-xs text-slate-500">
            Choisissez une selection principale pour afficher les donnees.
          </div>
        ) : !statsB ? (
          <Badge variant="secondary" className="w-fit">
            Ajoutez une comparaison pour afficher les ecarts
          </Badge>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Metrique</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                Selection {depotCodeA ? `(${depotCodeA})` : ''}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                Comparaison {depotCodeB ? `(${depotCodeB})` : ''}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                Ecart
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  Aucune donnee pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key} className="even:bg-slate-50/40">
                  <TableCell className="text-slate-700">{row.label}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${valueScaleClass(row.a, maxA)}`}
                  >
                    {row.fmtA(row.a)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${valueScaleClass(row.b, maxB)}`}
                  >
                    {statsB ? row.fmtB(row.b) : '-'}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${diffScaleClass(row.diff, maxDiff)}`}
                  >
                    {statsB
                      ? `${row.diff > 0 ? '+' : row.diff < 0 ? '-' : ''}${row.fmtDiff(
                          Math.abs(row.diff),
                        )}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
