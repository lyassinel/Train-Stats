'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DateOption, DepotOption, SerieOption } from '../types'

type Props = {
  title: string
  depots: DepotOption[]
  dates: DateOption[]
  series: SerieOption[]
  periodes: string[]
  selectedDepot: string
  selectedDate: string
  selectedSerie: string
  selectedPeriode: string
  disableSerie: boolean
  onDepotChange: (value: string) => void
  onDateChange: (value: string) => void
  onSerieChange: (value: string) => void
  onPeriodeChange: (value: string) => void
  mergedLabel: string
  mergedValue: string
  formatDateLabel: (value: string) => string
  className?: string
}

/**
 * Selection card with Shadcn UI selects for depot/date/serie/periode.
 */
export const SelectionCard = ({
  title,
  depots,
  dates,
  series,
  periodes,
  selectedDepot,
  selectedDate,
  selectedSerie,
  selectedPeriode,
  disableSerie,
  onDepotChange,
  onDateChange,
  onSerieChange,
  onPeriodeChange,
  mergedLabel,
  mergedValue,
  formatDateLabel,
}: Props) => {
  return (
    <Card className="mb-2.5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Depot</span>
            <Select value={selectedDepot} onValueChange={onDepotChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selectionnez un depot" />
              </SelectTrigger>
              <SelectContent>
                {depots.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.garefr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Date</span>
            <Select value={selectedDate} onValueChange={onDateChange} disabled={!selectedDepot}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selectionnez une date" />
              </SelectTrigger>
              <SelectContent>
                {dates.map((date) => (
                  <SelectItem key={date.id ?? date.date} value={date.date}>
                    {formatDateLabel(date.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Serie</span>
            <Select value={selectedSerie} onValueChange={onSerieChange} disabled={disableSerie}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Toutes les series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les series</SelectItem>
                {series.map((serieObj, idx) => (
                  <SelectItem key={serieObj.id ?? idx} value={serieObj.serie}>
                    {serieObj.serie}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Periode</span>
            <Select
              value={selectedPeriode}
              onValueChange={onPeriodeChange}
              disabled={!selectedDepot || !selectedDate}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Toutes les periodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les periodes</SelectItem>
                <SelectItem value={mergedValue}>{mergedLabel}</SelectItem>
                {periodes.map((periode) => (
                  <SelectItem key={periode} value={periode}>
                    {periode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
