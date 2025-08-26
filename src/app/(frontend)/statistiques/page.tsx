'use client'
import { useState, useEffect } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

export default function Page() {
  const [depots, setDepots] = useState<any[]>([])
  const [selectedDepot, setSelectedDepot] = useState<string>('')
  const [dates, setDates] = useState<string[]>([])

  useEffect(() => {
    const fetchDepots = async () => {
      const payload = await getPayload({ config })
      const depot = await payload.find({
        collection: 'gares',
        where: { depot: { equals: true } },
        limit: 100,
      })
      setDepots(depot.docs)
    }
    fetchDepots()
  }, [])

  useEffect(() => {
    if (!selectedDepot) {
      setDates([])
      return
    }
    const fetchDates = async () => {
      const payload = await getPayload({ config })
      const prestations = await payload.find({
        collection: 'prestations',
        where: { depot: { equals: selectedDepot } },
        limit: 1000,
      })
      // Récupère les dates uniques
      const uniqueDates = Array.from(new Set(prestations.docs.map((p: any) => p.date)))
      setDates(uniqueDates)
    }
    fetchDates()
  }, [selectedDepot])

  return (
    <>
      <div>Statistiques</div>
      <select value={selectedDepot} onChange={(e) => setSelectedDepot(e.target.value)}>
        <option value="">Sélectionner un dépôt</option>
        {depots.map((item) => (
          <option key={item.id} value={item.id}>
            {item.garefr}
          </option>
        ))}
      </select>
      {dates.length > 0 && (
        <select>
          <option value="">Sélectionner une date</option>
          {dates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      )}
    </>
  )
}
