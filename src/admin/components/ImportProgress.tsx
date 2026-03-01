'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import {
  useDocumentForm,
  useFormBackgroundProcessing,
  useFormFields,
  useFormProcessing,
  useFormSubmitted,
  useWatchForm,
} from '@payloadcms/ui'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const formatPercent = (value: number) => `${clamp(Math.round(value), 0, 100)}%`

const ImportProgress: React.FC = () => {
  const { getDataByPath } = useDocumentForm()
  const [, dispatchFields] = useFormFields((ctx) => ctx)
  const submitted = useFormSubmitted()
  const processing = useFormProcessing()
  const backgroundProcessing = useFormBackgroundProcessing()
  useWatchForm()

  const etat = (getDataByPath('etat') as string | undefined) ?? 'pending'
  const docId = (getDataByPath('id') as string | undefined) ?? ''
  const totalPrestations = Number(getDataByPath('numberOfPrestations') ?? 0)
  const donePrestations = Number(getDataByPath('numberOfPrestationsTraited') ?? 0)
  const totalServices = Number(getDataByPath('numberOfServices') ?? 0)
  const doneServices = Number(getDataByPath('numberOfServicesTraited') ?? 0)
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    if (!docId) return

    const applyUpdate = (path: string, value: unknown) => {
      dispatchFields({ type: 'UPDATE', path, value })
    }

    const syncFromServer = async () => {
      try {
        const res = await fetch(`/api/import/${docId}?depth=0`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        const doc = json?.doc ?? json
        if (!doc) return
        applyUpdate('etat', doc.etat)
        applyUpdate('log', doc.log)
        applyUpdate('numberOfPrestations', doc.numberOfPrestations)
        applyUpdate('numberOfPrestationsTraited', doc.numberOfPrestationsTraited)
        applyUpdate('numberOfServices', doc.numberOfServices)
        applyUpdate('numberOfServicesTraited', doc.numberOfServicesTraited)
        applyUpdate('amplitudedepot', doc.amplitudedepot)
        applyUpdate('drivedepot', doc.drivedepot)
        applyUpdate('hlpdepot', doc.hlpdepot)
        applyUpdate('resdepot', doc.resdepot)
        applyUpdate('statsSeriePeriode', doc.statsSeriePeriode ?? [])
        applyUpdate('statsDepotPeriode', doc.statsDepotPeriode ?? [])
      } catch {
        // ignore polling failures
      }
    }

    const startPolling = () => {
      if (pollingRef.current) return
      pollingRef.current = window.setInterval(syncFromServer, 2000)
    }

    const stopPolling = () => {
      if (!pollingRef.current) return
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    syncFromServer()
    const shouldPoll = etat === 'pending'
    if (shouldPoll) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [
    backgroundProcessing,
    dispatchFields,
    docId,
    etat,
    processing,
    submitted,
    totalPrestations,
    totalServices,
  ])

  const progress = useMemo(() => {
    if (totalPrestations > 0) {
      return (donePrestations / totalPrestations) * 100
    }
    if (totalServices > 0) {
      return (doneServices / totalServices) * 100
    }
    return 0
  }, [donePrestations, doneServices, totalPrestations, totalServices])

  const isActive =
    etat === 'pending' &&
    (processing || backgroundProcessing || submitted || totalPrestations > 0 || totalServices > 0)
  const label =
    etat === 'imported'
      ? 'Import termine'
      : etat === 'error'
        ? 'Import en erreur'
        : isActive
          ? 'Import en cours'
          : 'En attente (sauvegardez)'

  const hasTotals = totalPrestations > 0 || totalServices > 0

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isActive && (
          <span
            aria-label="Import en cours"
            style={{
              width: 12,
              height: 12,
              border: '2px solid #9ca3af',
              borderTopColor: '#111827',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
        <strong>{label}</strong>
      </div>

      <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>
        {hasTotals ? (
          <>
            Prestations: {donePrestations}/{totalPrestations} &nbsp;|&nbsp; Services: {doneServices}
            /{totalServices}
          </>
        ) : (
          'En attente...'
        )}
      </div>

      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999 }}>
        <div
          style={{
            height: '100%',
            width: formatPercent(progress),
            background: etat === 'error' ? '#ef4444' : '#111827',
            borderRadius: 999,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  )
}

export default ImportProgress
