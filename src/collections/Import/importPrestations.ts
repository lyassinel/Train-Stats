import type { PayloadRequest } from 'payload'
import type { Roulement } from '@/app/types/prestation'
import type { ImportDoc, PeriodStats, SeriesPeriodStats } from '@/lib/prestations/types'
import { parseOdtToText } from '@/lib/odt/parseOdt'
import {
  splitPrestations,
  splitTasks,
  durationMinutes,
  countCTB,
  getDepotStats,
} from './prestations'
import {
  amplitudeWithStartRegex,
  CTBDetailRegex,
  dateApplicationRegex,
  depotRegex,
  detailsPrestationRegex,
  numeroPrestationRegex,
  serieSemaineJourPeriodeRegex,
  startAndEndHoursRegex,
} from '@/lib/prestations/regex'
import { buildLog, formatDuration, round } from '@/lib/utils'
import { updateImport } from './helper'

/**
 * Import prestations from an ODT livret, compute stats, and persist results.
 */
export const runPrestationsImport = async ({
  doc,
  req,
  filePath,
}: {
  doc: ImportDoc
  req: PayloadRequest
  filePath: string
}) => {
  if (!doc.id) {
    throw new Error('Import doc is missing id')
  }
  const data = await parseOdtToText(filePath)
  const serieList: string[] = []
  const importStartedAt = Date.now()

  let totalCTBTraited = 0
  let totalDriveDepot = 0
  let totalReserveDepot = 0
  let totalHLPDepot = 0
  let totalAmplitudeDepot = 0
  let servicesCountForStats = 0
  let totalPrestationsTraited = 0
  let prestationErrors = 0
  let lastProgressUpdate = 0

  const totalCTBInDoc = countCTB(data)
  const prestations = splitPrestations(data)
  const totalPrestationsInDoc = prestations.length
  const depotLivretMatch = data.match(depotRegex)
  const dateLivret = data.match(dateApplicationRegex)
  const [jour, mois, annee] = dateLivret ? dateLivret[1].split('/') : ['01', '01', '1970']
  const dateISO = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
  const date = `${jour.padStart(2, '0')}-${mois.padStart(2, '0')}-${annee}`

  const baseLogLines = [
    'Import en cours',
    `Fichier: ${doc.filename ?? 'inconnu'}`,
    `Depot: ${depotLivretMatch && depotLivretMatch[1] ? depotLivretMatch[1] : 'inconnu'}`,
    `Date: ${date}`,
  ]

  const progressLine = () =>
    `Progression: prestations ${totalPrestationsTraited}/${totalPrestationsInDoc}, services ${totalCTBTraited}/${totalCTBInDoc}`

  const maybeUpdateProgress = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastProgressUpdate < 2000) return
    lastProgressUpdate = now
    await updateImport(
      {
        numberOfPrestationsTraited: totalPrestationsTraited,
        numberOfServicesTraited: totalCTBTraited,
        log: buildLog([...baseLogLines, progressLine()]),
      },
      req,
      doc,
    )
  }

  await updateImport(
    {
      numberOfPrestations: totalPrestationsInDoc,
      numberOfServices: totalCTBInDoc,
      numberOfPrestationsTraited: totalPrestationsTraited,
      numberOfServicesTraited: totalCTBTraited,
      log: buildLog([...baseLogLines, progressLine()]),
    },
    req,
    doc,
  )

  let groupedArray: SeriesPeriodStats[] = []
  let groupedDepotArray: PeriodStats[] = []
  const globalCountGroupedBySeries: Record<string, SeriesPeriodStats> = {}
  const globalCountGroupedByPeriode: Record<string, PeriodStats> = {}

  let idDepotLivret: { docs: { id: string }[] } | undefined
  if (depotLivretMatch) {
    idDepotLivret = await req.payload.find({
      collection: 'gares',
      where: { code: { equals: depotLivretMatch[1] } },
    })

    if (idDepotLivret && idDepotLivret.docs[0].id) {
      const existing = await req.payload.find({
        collection: 'prestations',
        where: {
          and: [{ date: { equals: dateISO } }, { depot: { equals: idDepotLivret.docs[0].id } }],
        },
      })

      if (existing.totalDocs > 0) {
        console.log(
          `Prestation deja existante pour ce depot et cette date : ${depotLivretMatch[1]} - ${date}`,
        )
        const duplicateLog = buildLog([
          ...baseLogLines,
          'Import deja dans la base',
          `Prestations: ${totalPrestationsTraited}/${totalPrestationsInDoc}`,
          `Services: ${totalCTBTraited}/${totalCTBInDoc}`,
        ])
        await updateImport(
          {
            etat: 'error',
            log: duplicateLog,
            name: depotLivretMatch[1] + ' ' + date,
            numberOfPrestations: totalPrestationsInDoc,
            numberOfServices: totalCTBInDoc,
            numberOfPrestationsTraited: totalPrestationsTraited,
            numberOfServicesTraited: totalCTBTraited,
          },
          req,
          doc,
        )
        return
      }

      for (let i = 0; i < prestations.length; i++) {
        const prestation = prestations[i]

        const serieSemaine = prestation.match(serieSemaineJourPeriodeRegex)

        const match = prestation.match(numeroPrestationRegex)
        const dateApplication = prestation.match(dateApplicationRegex)
        const dureeSemaineDebut = prestation.match(amplitudeWithStartRegex)
        const heureDebutContenuHeureFin = prestation.match(startAndEndHoursRegex)

        let totalReserve = 0
        let totalActif = 0
        let totalHLP = 0
        let amplitudeMintues = 0

        let totalDrivePrestation = 0
        let numeroPrestation = ''
        let amplitudePrestation = ''
        let heureDebutPrestation = ''
        let heureFinPrestation = ''
        let periodePrestation = ''
        const roulementsData: Roulement[] = []
        const dayKeys: string[] = []
        const dayPeriodKeys: string[] = []

        if (match) {
          numeroPrestation = match[2]
          periodePrestation = match[4] ? match[4] : '*'
        }

        if (dureeSemaineDebut) {
          amplitudePrestation = dureeSemaineDebut[1] + ':' + dureeSemaineDebut[2]
          amplitudeMintues = Number(dureeSemaineDebut[1]) * 60 + Number(dureeSemaineDebut[2])
        }

        if (heureDebutContenuHeureFin) {
          heureDebutPrestation = heureDebutContenuHeureFin[1] + ':' + heureDebutContenuHeureFin[2]
          heureFinPrestation = heureDebutContenuHeureFin[4] + ':' + heureDebutContenuHeureFin[5]

          if (serieSemaine) {
            for (const semaine of serieSemaine) {
              const roulement = semaine.match(CTBDetailRegex)
              if (roulement) {
                totalCTBTraited++

                if (roulement[3] == 'N' && roulement[4]) {
                  const nbDeLaSemaine = '1234567'
                  const toRemove = roulement[4]
                  roulement[4] = nbDeLaSemaine.replace(new RegExp(`[${toRemove}]`, 'g'), '')
                }
                if (!roulement[4] || roulement[4].length === 0) {
                  console.log('WARN CTB sans jours :', roulement[0])
                }

                if (!serieList.includes(roulement[1])) {
                  serieList.push(roulement[1])
                }
                if (roulement[4]) {
                  const joursRoulement = roulement[4].split('')

                  for (const jour of joursRoulement) {
                    roulementsData.push({
                      serie: roulement[1],
                      semaine: roulement[2] ? String(roulement[2]) : '0',
                      jour: jour,
                      periode: roulement[5] ? roulement[5] : '*',
                    })
                    const periode = roulement[5] ? roulement[5] : '*'
                    const key = `${roulement[1]}-${periode}`

                    if (!globalCountGroupedBySeries[key]) {
                      globalCountGroupedBySeries[key] = {
                        serie: roulement[1],
                        periode: periode,
                        count: 0,
                        countPrestations: 0,
                        totalDrive: 0,
                        totalReserve: 0,
                        totalHLP: 0,
                        totalActif: 0,
                        totalAmplitude: 0,
                        totalAmplitudePrestations: 0,
                      }
                    }

                    const stats = globalCountGroupedBySeries[key]
                    stats.count += 1
                    dayKeys.push(key)

                    if (!globalCountGroupedByPeriode[periode]) {
                      globalCountGroupedByPeriode[periode] = {
                        periode,
                        count: 0,
                        countPrestations: 0,
                        totalDrive: 0,
                        totalReserve: 0,
                        totalHLP: 0,
                        totalActif: 0,
                        totalAmplitude: 0,
                        totalAmplitudePrestations: 0,
                      }
                    }
                    globalCountGroupedByPeriode[periode].count += 1
                    dayPeriodKeys.push(periode)
                  }
                }
              }
            }
          } else {
            console.log(`Aucun roulement trouve pour la prestation : ${prestation}`)
          }

          const tachesPrestation = splitTasks(heureDebutContenuHeureFin[3])
          for (const tache of tachesPrestation) {
            let totalTache = 0
            const detailsPrestation = tache.match(detailsPrestationRegex)
            if (detailsPrestation) {
              if (detailsPrestation[16] && detailsPrestation[18]) {
                totalTache = durationMinutes(
                  detailsPrestation[16],
                  detailsPrestation[17],
                  detailsPrestation[18],
                  detailsPrestation[19],
                )
                totalActif += totalTache
              }
              if (detailsPrestation[3] == 'Res' || detailsPrestation[3] == 'StaByMO') {
                totalTache = durationMinutes(
                  detailsPrestation[16],
                  detailsPrestation[17],
                  detailsPrestation[18],
                  detailsPrestation[19],
                )
                totalReserve += totalTache
              }
              if (detailsPrestation[3] == 'HLP') {
                totalTache = durationMinutes(
                  detailsPrestation[16],
                  detailsPrestation[17],
                  detailsPrestation[18],
                  detailsPrestation[19],
                )
                totalHLP += totalTache
              }
              if (
                detailsPrestation[7] ||
                detailsPrestation[2] ||
                detailsPrestation[3] == 'CarWash'
              ) {
                totalTache = durationMinutes(
                  detailsPrestation[16],
                  detailsPrestation[17],
                  detailsPrestation[18],
                  detailsPrestation[19],
                )
                totalDrivePrestation += totalTache
              }
            }
          }

          if (dayKeys.length > 0) {
            for (const key of dayKeys) {
              const stats = globalCountGroupedBySeries[key]
              if (!stats) continue
              stats.totalDrive += totalDrivePrestation
              stats.totalReserve += totalReserve
              stats.totalHLP += totalHLP
              stats.totalActif += totalActif
              stats.totalAmplitude += amplitudeMintues
            }
          }
          if (dayPeriodKeys.length > 0) {
            for (const periode of dayPeriodKeys) {
              const stats = globalCountGroupedByPeriode[periode]
              if (!stats) continue
              stats.totalDrive += totalDrivePrestation
              stats.totalReserve += totalReserve
              stats.totalHLP += totalHLP
              stats.totalActif += totalActif
              stats.totalAmplitude += amplitudeMintues
            }
          }

          // Track unique prestations per serie/periode and per periode (no day-weighting).
          const uniqueSeriesKeys = Array.from(new Set(dayKeys))
          for (const key of uniqueSeriesKeys) {
            const stats = globalCountGroupedBySeries[key]
            if (!stats) continue
            stats.countPrestations += 1
            stats.totalAmplitudePrestations += amplitudeMintues
          }
          const uniquePeriodKeys = Array.from(new Set(dayPeriodKeys))
          for (const periode of uniquePeriodKeys) {
            const stats = globalCountGroupedByPeriode[periode]
            if (!stats) continue
            stats.countPrestations += 1
            stats.totalAmplitudePrestations += amplitudeMintues
          }
        }

        if (match && dateApplication && dureeSemaineDebut && heureDebutContenuHeureFin) {
          console.log(`Prestation : ${i + 1} en cours de traitement sur ${prestations.length}`)
        } else {
          console.log(`Prestation invalide : ${prestation}`)
        }

        try {
          await req.payload.create({
            collection: 'prestations',
            data: {
              name: numeroPrestation,
              depot: idDepotLivret.docs[0].id,
              date: dateISO,
              heureDebut: heureDebutPrestation,
              heureFin: heureFinPrestation,
              amplitude: amplitudePrestation,
              periode: periodePrestation,
              roulement: roulementsData,
              tempsConduite: totalDrivePrestation,
              RawData: prestation,
              amplitudeMin: amplitudeMintues,
              tempsReserve: totalReserve,
              tempsActif: totalActif,
              tempsHLP: totalHLP,
            },
          })
          totalPrestationsTraited += 1
          for (const { periode } of Object.values(globalCountGroupedBySeries)) {
            if (periode === '1' || periode === '*' || periode === 'A' || periode === '6') {
              totalHLPDepot += totalHLP
              totalReserveDepot += totalReserve
              totalDriveDepot += totalDrivePrestation
              totalAmplitudeDepot += amplitudeMintues
              servicesCountForStats += 1
            }
          }
          console.log(`Prestation importee`, totalPrestationsTraited, 'sur', prestations.length)
        } catch (err) {
          prestationErrors += 1
          console.error(`Erreur lors de l'import de la prestation : ${err}`)
        }
        await maybeUpdateProgress()
      }
    }
  }

  groupedArray = Object.values(globalCountGroupedBySeries).map((s) => {
    const avgDrive = s.count > 0 ? s.totalDrive / s.count : 0
    const avgReserve = s.count > 0 ? s.totalReserve / s.count : 0
    const avgHLP = s.count > 0 ? s.totalHLP / s.count : 0
    const avgActif = s.count > 0 ? s.totalActif / s.count : 0
    const avgAmplitude = s.count > 0 ? s.totalAmplitude / s.count : 0
    // Average amplitude per prestation (no day-weighting)
    const avgAmplitudePrestations =
      s.countPrestations > 0 ? s.totalAmplitudePrestations / s.countPrestations : 0
    const denom = s.totalAmplitude > 0 ? s.totalAmplitude : 0
    const pctDrive = denom > 0 ? (s.totalDrive / denom) * 100 : 0
    const pctReserve = denom > 0 ? (s.totalReserve / denom) * 100 : 0
    const pctHLP = denom > 0 ? (s.totalHLP / denom) * 100 : 0
    const pctActif = denom > 0 ? (s.totalActif / denom) * 100 : 0

    return {
      ...s,
      totalDrive: round(s.totalDrive, 100),
      totalReserve: round(s.totalReserve, 100),
      totalHLP: round(s.totalHLP, 100),
      totalActif: round(s.totalActif, 100),
      totalAmplitude: round(s.totalAmplitude, 100),
      countPrestations: s.countPrestations,
      avgDrive: round(avgDrive, 100),
      avgReserve: round(avgReserve, 100),
      avgHLP: round(avgHLP, 100),
      avgActif: round(avgActif, 100),
      avgAmplitude: round(avgAmplitude, 100),
      avgAmplitudePrestations: round(avgAmplitudePrestations, 100),
      pctDrive: round(pctDrive, 10),
      pctReserve: round(pctReserve, 10),
      pctHLP: round(pctHLP, 10),
      pctActif: round(pctActif, 10),
    }
  })

  groupedDepotArray = Object.values(globalCountGroupedByPeriode).map((s) => {
    const avgDrive = s.count > 0 ? s.totalDrive / s.count : 0
    const avgReserve = s.count > 0 ? s.totalReserve / s.count : 0
    const avgHLP = s.count > 0 ? s.totalHLP / s.count : 0
    const avgActif = s.count > 0 ? s.totalActif / s.count : 0
    const avgAmplitude = s.count > 0 ? s.totalAmplitude / s.count : 0
    // Average amplitude per prestation (no day-weighting)
    const avgAmplitudePrestations =
      s.countPrestations > 0 ? s.totalAmplitudePrestations / s.countPrestations : 0
    const denom = s.totalAmplitude > 0 ? s.totalAmplitude : 0
    const pctDrive = denom > 0 ? (s.totalDrive / denom) * 100 : 0
    const pctReserve = denom > 0 ? (s.totalReserve / denom) * 100 : 0
    const pctHLP = denom > 0 ? (s.totalHLP / denom) * 100 : 0
    const pctActif = denom > 0 ? (s.totalActif / denom) * 100 : 0

    return {
      ...s,
      totalDrive: round(s.totalDrive, 100),
      totalReserve: round(s.totalReserve, 100),
      totalHLP: round(s.totalHLP, 100),
      totalActif: round(s.totalActif, 100),
      totalAmplitude: round(s.totalAmplitude, 100),
      countPrestations: s.countPrestations,
      avgDrive: round(avgDrive, 100),
      avgReserve: round(avgReserve, 100),
      avgHLP: round(avgHLP, 100),
      avgActif: round(avgActif, 100),
      avgAmplitude: round(avgAmplitude, 100),
      avgAmplitudePrestations: round(avgAmplitudePrestations, 100),
      pctDrive: round(pctDrive, 10),
      pctReserve: round(pctReserve, 10),
      pctHLP: round(pctHLP, 10),
      pctActif: round(pctActif, 10),
    }
  })

  console.log('Stats globales serie / periode :', groupedArray)
  console.log('Stats depot / periode :', groupedDepotArray)

  // after processing all prestations: check CTB counts and update import doc
  if (totalCTBInDoc !== totalCTBTraited) {
    console.warn('WARN Tous les CTB du document n ont pas ete traites !')
    console.log(`CTB trouves dans le document : ${totalCTBInDoc}`)
    console.log(`CTB traites par le code     : ${totalCTBTraited}`)
  }
  console.log('Series trouvees :', serieList.join(', '))
  if (depotLivretMatch && depotLivretMatch[1]) {
    const depotExistant = await req.payload.find({
      collection: 'gares',
      where: {
        code: { equals: depotLivretMatch[1] },
      },
    })
    if (depotExistant && depotExistant.docs && depotExistant.docs.length > 0) {
      await req.payload.update({
        collection: 'gares',
        id: depotExistant.docs[0].id,
        data: {
          depot: true,
          seriesDepot: serieList.map((s) => ({ serie: s })),
        },
      })
    }
  } else {
    console.log(
      `Aucun depot trouve pour le code : ${
        depotLivretMatch && depotLivretMatch[1] ? depotLivretMatch[1] : 'inconnu'
      }`,
    )
  }

  const { avgDrive, avgHLP, avgReserve, avgAmplitude } = getDepotStats(
    servicesCountForStats,
    totalDriveDepot,
    totalHLPDepot,
    totalReserveDepot,
    totalAmplitudeDepot,
  )
  console.log('compteur de services', servicesCountForStats)
  console.log('Statistiques reserve du depot :', totalReserveDepot)
  console.log('Statistiques moyenne reserve du depot :', avgReserve)

  const finalLogLines = [
    'Import termine',
    `Fichier: ${doc.filename ?? 'inconnu'}`,
    `Depot: ${depotLivretMatch && depotLivretMatch[1] ? depotLivretMatch[1] : 'inconnu'}`,
    `Date: ${date}`,
    `Prestations: ${totalPrestationsTraited}/${totalPrestationsInDoc}`,
    `Services: ${totalCTBTraited}/${totalCTBInDoc}`,
    `Erreurs prestations: ${prestationErrors}`,
    `Duree: ${formatDuration(Date.now() - importStartedAt)}`,
    totalCTBInDoc !== totalCTBTraited ? `Warning: CTB ${totalCTBTraited}/${totalCTBInDoc}` : '',
  ]
  const finalLog = buildLog(finalLogLines)
  if (depotLivretMatch && depotLivretMatch[1]) {
    setTimeout(() => {
      req.payload
        .update({
          collection: 'import',
          id: doc.id,
          data: {
            etat: 'imported',
            log: finalLog,
            name: depotLivretMatch[1] + ' ' + date,
            numberOfPrestations: totalPrestationsInDoc,
            numberOfServices: totalCTBInDoc,
            numberOfPrestationsTraited: totalPrestationsTraited,
            numberOfServicesTraited: totalCTBTraited,
            drivedepot: round(avgDrive, 100),
            hlpdepot: round(avgHLP, 100),
            resdepot: round(avgReserve, 100),
            amplitudedepot: round(avgAmplitude, 100),
            statsSeriePeriode: groupedArray,
            statsDepotPeriode: groupedDepotArray,
          },
          overrideAccess: true,
        })
        .catch(console.error)
    }, 1000)
  }
}
