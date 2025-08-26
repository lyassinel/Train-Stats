import type { CollectionConfig } from 'payload'
import path from 'path'
import fs from 'fs/promises'
import JSZip from 'jszip'
import he from 'he'
import { textToPrestations, decoupeTachesPrestation, additionnerHeures } from './prestations'

// helper: parse an .odt file (read content.xml from the zip and rebuild a plain text
// representation while preserving spaces represented by <text:s> and <text:tab>). This
// is intentionally a string-based lightweight parser (no heavy DOM traversal) and
// tries to reproduce behaviour similar to officeparser with newlineDelimiter = ' '.
async function parseOdtToText(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)

  const contentFile = zip.file('content.xml')
  if (!contentFile) {
    // fallback: maybe it's already a plain text file
    return buffer.toString('utf-8').replace(/\s+/g, ' ').trim()
  }

  let xml = await contentFile.async('string')

  // 1) expand <text:s text:c="N"/> into N spaces
  xml = xml.replace(/<text:s[^>]*text:c="(\d+)"[^>]*\/>/g, (_, n) => ' '.repeat(Number(n)))
  // 2) single <text:s/> becomes a single space
  xml = xml.replace(/<text:s(?:\s+[^>]*)?\/>/g, ' ')
  // 3) tabs
  xml = xml.replace(/<text:tab(?:\s+[^>]*)?\/>/g, '\t')
  // 4) treat paragraph/heading ends as a space (mimic newlineDelimiter: ' ')
  xml = xml.replace(/<\/text:p>/g, ' ')
  xml = xml.replace(/<\/text:h>/g, ' ')
  // 5) remove remaining tags
  xml = xml.replace(/<[^>]+>/g, '')
  // 6) decode html/xml entities
  let text = he.decode(xml)
  // 7) normalize whitespace (convert runs of whitespace and newlines into single spaces)
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

const config = {
  // placeholder in case you want to keep some config values later
}

export const Import: CollectionConfig = {
  slug: 'import',
  labels: {
    singular: 'Import',
    plural: 'Imports',
  },
  upload: true,
  fields: [
    {
      name: 'Type',
      type: 'select',
      options: [
        { label: 'Prestations', value: 'prestations' },
        { label: 'Lieux', value: 'lieux' },
      ],
      required: true,
    },
    {
      name: 'etat',
      type: 'select',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'Importé', value: 'imported' },
        { label: 'Erreur', value: 'error' },
      ],
      defaultValue: 'pending',
      admin: { readOnly: true },
    },
    {
      name: 'log',
      type: 'textarea',
      admin: { readOnly: true },
    },
  ],

  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // skip if already imported
        if (doc.etat === 'imported') return

        try {
          const filePath = path.resolve(process.cwd(), `import/${doc.filename}`)

          if (doc.Type === 'prestations') {
            // --- parse file to plain text (ODT) ---
            const data = await parseOdtToText(filePath)
            let serieList: string[] = []
            let depotLivretMatch: RegExpMatchArray | null = null
            // count total CTB occurrences in the whole document (useful to compare later)
            const totalCTBInDoc = (data.match(/CTB/g) || []).length
            let totalCTBFound = 0

            const prestationsArray = textToPrestations(data)
            let documentValide = 0

            for (let i = 0; i < prestationsArray.length; i++) {
              const prestation = prestationsArray[i]

              const regexTitre = /Prestation ?(\w{1,4}) *(\d{1,4}) ?(\w\d{0,3}) ?(\w*)/
              const regexDateApplication = /Date ?d'application *(\d{2}\/\d{2}\/\d{4})/
              const regexDureeSemaineDebut =
                /Durée ?: ?(\d{2}).(\d{2})\* ?CTB ?(\w+)( *\d*) ?((R|N)\d+)? (?:\w|\W){0,3} ?\*(\d{2}).(\d{2})/
              const regexHeureDebutContenuHeureFin =
                /\*(\d{2}).(\d{2})\*{5,} ?\*+(.+)\*{7} \*(\d{2}).(\d{2})/
              const regexDetailsPrestation =
                /(?:(?:(\w{2}) (\d{3,6}) )?(VoetPied|HLP|AfRelDP|AfRel|Res|UitGar|PerQuai|Taxi|Plat|VkPc|BkPr|CarWash|IdRem|KopCpDP|KopCp|Bus|RAMAN|RaManMO|TRANSFER|Transfer) ([A-Z]{2,6}) *-*([A-Z]{2,6})*)?(?:(?:(ER|RE|EM|ME|ZR|RZ) )?(\d{3,6}) (N|R)(\d{0,}) (\w)? ?(?:\d )?(\w{2,5}) *-(\w{2,5}))?(?:\d{3,5} (R|N)(\d{1,5}) (\w))? (\d{2}).(\d{2})-(\d{2}).(\d{2})/
              const regexSerieSemaine = /CTB ?\w{1,3} ?\d{0,2}?(?: +)?(?:R|N)\d+ ?\w{0,2}/g
              const regexCTB = /CTB ?(\w+) ?(\d{1,2})? ?(R|N)(\d+) ?(\w+)?/

              const serieSemaine = prestation.match(regexSerieSemaine)

              const match = prestation.match(regexTitre)
              const dateApplication = prestation.match(regexDateApplication)
              const dureeSemaineDebut = prestation.match(regexDureeSemaineDebut)
              const heureDebutContenuHeureFin = prestation.match(regexHeureDebutContenuHeureFin)

              let totalReserve = 0
              let totalActif = 0
              let totalHLP = 0
              let amplitudeMintues = 0

              let totalDrivePrestation = 0
              let numeroPrestation: string = ''
              let amplitudePrestation: string = ''
              let heureDebutPrestation: string = ''
              let heureFinPrestation: string = ''
              let periodePrestation: string = ''
              let roulementsData: any[] = []

              if (match) {
                numeroPrestation = match[2]
                periodePrestation = match[4] ? match[4] : "Toute l'année"
              }

              if (dureeSemaineDebut) {
                amplitudePrestation = dureeSemaineDebut[1] + ':' + dureeSemaineDebut[2]
                amplitudeMintues = Number(dureeSemaineDebut[1]) * 60 + Number(dureeSemaineDebut[2])
              }

              if (heureDebutContenuHeureFin) {
                heureDebutPrestation =
                  heureDebutContenuHeureFin[1] + ':' + heureDebutContenuHeureFin[2]
                heureFinPrestation =
                  heureDebutContenuHeureFin[4] + ':' + heureDebutContenuHeureFin[5]

                const tachesPrestation = decoupeTachesPrestation(heureDebutContenuHeureFin[3])
                for (const tache of tachesPrestation) {
                  let totalTache = 0
                  const detailsPrestation = tache.match(regexDetailsPrestation)
                  if (detailsPrestation) {
                    if (detailsPrestation[16] && detailsPrestation[18]) {
                      totalTache = additionnerHeures(
                        detailsPrestation[16],
                        detailsPrestation[17],
                        detailsPrestation[18],
                        detailsPrestation[19],
                      )
                      totalActif += totalTache
                    }
                    if (detailsPrestation[3] == 'Res') {
                      totalTache = additionnerHeures(
                        detailsPrestation[16],
                        detailsPrestation[17],
                        detailsPrestation[18],
                        detailsPrestation[19],
                      )
                      totalReserve += totalTache
                    }
                    if (detailsPrestation[3] == 'HLP') {
                      totalTache = additionnerHeures(
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
                      totalTache = additionnerHeures(
                        detailsPrestation[16],
                        detailsPrestation[17],
                        detailsPrestation[18],
                        detailsPrestation[19],
                      )
                      totalDrivePrestation += totalTache
                    }
                  }
                }
              }

              if (serieSemaine) {
                for (const semaine of serieSemaine) {
                  let roulement = semaine.match(regexCTB)
                  if (roulement) {
                    totalCTBFound++

                    if (roulement[3] == 'N') {
                      const nbDeLaSemaine = '1234567'
                      const toRemove = roulement[4]
                      roulement[4] = nbDeLaSemaine.replace(new RegExp(`[${toRemove}]`, 'g'), '')
                    }

                    const joursRoulement = roulement[4].split('')
                    for (const jour of joursRoulement) {
                      if (!serieList.includes(roulement[1])) {
                        serieList.push(roulement[1])
                      }
                      roulementsData.push({
                        serie: roulement[1],
                        semaine: roulement[2] ? String(roulement[2]) : '0',
                        jour: jour,
                        periode: roulement[5],
                      })
                    }
                  }
                }
              }

              if (match && dateApplication && dureeSemaineDebut && heureDebutContenuHeureFin) {
                documentValide += 1
              } else {
                console.log(`Prestation invalide : ${prestation}`)
              }

              // create prestation if not exists
              // resolve depot id (similar to your original logic)
              const regexDepotLivret = /(?:Prestation|Prestatie) {1,2}(\w{2,6})/
              depotLivretMatch = data.match(regexDepotLivret)
              const regexDateDapplication =
                /(?:Date d'application|Toepassingsdatum) (\d{2}\/\d{2}\/\d{4})/
              const dateLivret = data.match(regexDateDapplication)
              const [jour, mois, annee] = dateLivret
                ? dateLivret[1].split('/')
                : ['01', '01', '1970']
              const dateISO = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`

              let idDepotLivret: any = undefined
              if (depotLivretMatch && depotLivretMatch[1]) {
                idDepotLivret = await req.payload.find({
                  collection: 'gares',
                  where: { code: { equals: depotLivretMatch[1] } },
                })
              }

              if (
                idDepotLivret &&
                idDepotLivret.docs &&
                idDepotLivret.docs[0] &&
                idDepotLivret.docs[0].id
              ) {
                const existing = await req.payload.find({
                  collection: 'prestations',
                  where: {
                    and: [
                      { date: { equals: dateISO } },
                      { depot: { equals: idDepotLivret.docs[0].id } },
                      { name: { equals: numeroPrestation } },
                      { periode: { equals: periodePrestation } },
                      { roulement: { equals: roulementsData } },
                    ],
                  },
                })

                if (existing.totalDocs === 0) {
                  await req.payload
                    .create({
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
                    .then(() =>
                      console.log(
                        `Prestation importée`,
                        documentValide,
                        'sur',
                        prestationsArray.length,
                      ),
                    )
                    .catch((err) =>
                      console.error(`Erreur lors de l'import de la prestation : ${err}`),
                    )
                } else {
                  console.log(
                    `Prestation déjà existante pour ce dépôt et cette date : ${numeroPrestation}`,
                  )
                }
              }
            } // end for prestationsArray

            // after processing all prestations: check CTB counts and update import doc
            if (totalCTBInDoc !== totalCTBFound) {
              console.warn('⚠️ Tous les CTB du document n’ont pas été traités !')
              console.log(`CTB trouvés dans le document : ${totalCTBInDoc}`)
              console.log(`CTB traités par le code     : ${totalCTBFound}`)
            }
            console.log('Séries trouvées :', serieList.join(', '))
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
                `Aucun dépôt trouvé pour le code : ${
                  depotLivretMatch && depotLivretMatch[1] ? depotLivretMatch[1] : 'inconnu'
                }`,
              )
            }
          }

          // update import doc state
          setTimeout(() => {
            req.payload
              .update({
                collection: 'import',
                id: doc.id,
                data: {
                  etat: 'imported',
                  log: 'Import terminé',
                },
                overrideAccess: true,
              })
              .catch(console.error)
          }, 0)

          ////

          if (doc.Type === 'lieux') {
            const fileContents = await fs.readFile(filePath, 'utf-8')
            const data = JSON.parse(fileContents)

            const allGares = await req.payload.find({ collection: 'gares', limit: 10000 })
            const codesExistants = new Set(allGares.docs.map((g: any) => g.code))

            for (const gare of data) {
              if (!codesExistants.has(gare.code)) {
                await req.payload.create({
                  collection: 'gares',
                  data: { garefr: gare.gareFR, garenl: gare.gareNL, code: gare.code },
                })
                console.log(`Gare ${gare.gareFR} importée avec succès.`)
                codesExistants.add(gare.code)
              } else {
                console.log(`Gare ${gare.gareFR} déjà existante, import ignoré.`)
              }
            }

            // mark imported
          }
        } catch (error) {
          console.error('Error processing import:', error)
          await req.payload.update({
            collection: 'import',
            id: doc.id,
            data: {
              etat: 'error',
              log: error instanceof Error ? error.message : 'Erreur inconnue',
            },
          })
        }
      },
    ],
  },
}
