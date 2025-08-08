import type { CollectionConfig } from 'payload'
import path from 'path'
import fs from 'fs/promises'
import { OfficeParserConfig, parseOfficeAsync } from 'officeparser'
import { textToPrestations, decoupeTachesPrestation } from './prestations'

const config: OfficeParserConfig = {
  newlineDelimiter: ' ', // Separate new lines with a space instead of the default \n.
  ignoreNotes: true, // Ignore notes while parsing presentation files like pptx or odp.
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
        {
          label: 'Prestations',
          value: 'prestations',
        },
        {
          label: 'Lieux',
          value: 'lieux',
        },
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
        if (doc.etat === 'imported') return
        try {
          const filePath = path.resolve(process.cwd(), `import/${doc.filename}`)
          if (doc.Type === 'prestations') {
            parseOfficeAsync(filePath, config)
              .then(async (data) => {
                const regexDepotLivret = /(?:Prestation|Prestatie) {1,2}(\w{2,6})/
                const regexDateDapplication =
                  /(?:Date d'application|Toepassingsdatum) (\d{2}\/\d{2}\/\d{4})/
                const depotLivret = data.match(regexDepotLivret)
                const dateLivret = data.match(regexDateDapplication)
                const [jour, mois, annee] = dateLivret
                  ? dateLivret[1].split('/')
                  : ['01', '01', '1970']
                const dateISO = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
                let idDepotLivret
                if (depotLivret) {
                  idDepotLivret = await req.payload.find({
                    collection: 'gares',
                    where: {
                      code: {
                        equals: depotLivret[1],
                      },
                    },
                  })
                }

                const prestationsArray = textToPrestations(data)
                let documentValide = 0
                for (let i = 0; i < prestationsArray.length; i++) {
                  const prestation = prestationsArray[i]

                  const regexTitre = /Prestation (\w{1,4}) *(\d{1,4}) (\w\d{0,3}) (\w+)/
                  const regexDateApplication = /Date d'application *(\d{2}\/\d{2}\/\d{4})/
                  const regexDureeSemaineDebut =
                    /Durée : (\d{2}).(\d{2})\* CTB (\w+)( *\d*) ((R|N)\d+) \w+ \*(\d{2}).(\d{2})/
                  const regexHeureDebutContenuHeureFin =
                    /\*(\d{2}).(\d{2})\*{5,} \*+(.+)\*{8}(\d{2}).(\d{2})/
                  const regexDetailsPrestation =
                    /(?:(?:(\w{2}) (\d{3,6}) )?(VoetPied|HLP|AfRelDP|AfRel|Res|UitGar|PerQuai|Taxi|Plat|VkPc|BkPr|CarWash|IdRem|KopCpDP|KopCp|Bus|RAMAN|RaManMO|TRANSFER) ([A-Z]{2,6}) *-*([A-Z]{2,6})*)?(?:(?:(ER|RE|EM|ME|ZR|RZ) )?(\d{3,6}) (N|R)(\d{0,}) (\w)? ?(?:\d )?(\w{2,5}) *-(\w{2,5}))?(?:\d{3,5} (R|N)(\d{1,5}) (\w))? (\d{2}).(\d{2})-(\d{2}).(\d{2})/
                  const regexSerieSemaine = /CTB +(\w{1,3}) +(\d{1,2})?(?: +)?R(\d) +(\w{1,2})/g
                  const serieSemaine = data.match(regexSerieSemaine)

                  const match = prestation.match(regexTitre)
                  const dateApplication = prestation.match(regexDateApplication)
                  const dureeSemaineDebut = prestation.match(regexDureeSemaineDebut)
                  const heureDebutContenuHeureFin = prestation.match(regexHeureDebutContenuHeureFin)
                  let totalDrivePrestation = 0
                  let numeroPrestation: string = ''
                  let amplitudePrestation: string = ''
                  let heureDebutPrestation: string = ''
                  let heureFinPrestation: string = ''
                  let periodePrestation: string = ''
                  if (match) {
                    numeroPrestation = match[2]
                    periodePrestation = match[4]

                    //console.log(`Depot de la prestation : ${match[1]}`);
                    //console.log(`Numéro de la prestation : ${match[2]}`);
                    //console.log(`Roule : ${match[3]}`);
                    //console.log(`Periode de la prestation : ${match[4]}`);
                    // console.log(`Date d'application : ${dateApplication ? dateApplication[1] : 'Non spécifiée'}`);
                  }
                  if (dureeSemaineDebut) {
                    //console.log("Erreur dans la prestation", match && match[2] ? match[2] : 'inconnue');
                    //console.log(prestation);
                    amplitudePrestation = dureeSemaineDebut[1] + ':' + dureeSemaineDebut[2]
                  }

                  if (heureDebutContenuHeureFin) {
                    heureDebutPrestation =
                      heureDebutContenuHeureFin[1] + ':' + heureDebutContenuHeureFin[2]
                    heureFinPrestation =
                      heureDebutContenuHeureFin[4] + ':' + heureDebutContenuHeureFin[5]
                    const tachesPrestation = decoupeTachesPrestation(heureDebutContenuHeureFin[3])
                    for (const tache of tachesPrestation) {
                      const detailsPrestation = tache.match(regexDetailsPrestation)
                      if (detailsPrestation) {
                        if (detailsPrestation[7] || detailsPrestation[2]) {
                          const heureDebutDrive =
                            Number(detailsPrestation[16]) * 60 + Number(detailsPrestation[17])
                          const heureFinDrive =
                            Number(detailsPrestation[18]) * 60 + Number(detailsPrestation[19])
                          const totalDrive = heureFinDrive - heureDebutDrive
                          totalDrivePrestation += totalDrive
                        }
                      }
                    }
                  }
                  console.log('CTB', serieSemaine)
                  if (serieSemaine) {
                    console.log(`Roule en série : ${serieSemaine[1]}`)
                    console.log(`Semaine : ${serieSemaine[2]}`)
                    console.log(`Jour : ${serieSemaine[3]}`)
                    console.log(`Periode : ${serieSemaine[4]}`)
                  }

                  if (match && dateApplication && dureeSemaineDebut && heureDebutContenuHeureFin) {
                    documentValide += 1
                    console.log(
                      `Prestation valide : ${documentValide} sur ${prestationsArray.length}`,
                    )
                    console.log(`Total Drive prestation : ${totalDrivePrestation} minutes`)
                  } else {
                    console.log(`Prestation invalide : ${prestation}`)
                  }
                  if (
                    idDepotLivret &&
                    idDepotLivret.docs &&
                    idDepotLivret.docs[0] &&
                    idDepotLivret.docs[0].id
                  ) {
                    // Avant la création :
                    const existing = await req.payload.find({
                      collection: 'prestations',
                      where: {
                        and: [
                          { date: { equals: dateISO } }, // ou le champ dateApplication selon ton schéma
                          { depot: { equals: idDepotLivret.docs[0].id } },
                          { name: { equals: numeroPrestation } }, // optionnel, si tu veux aussi tester le numéro
                          { periode: { equals: periodePrestation } }, // optionnel, si tu veux aussi tester la période
                        ],
                      },
                    })

                    if (existing.totalDocs === 0) {
                      // Elle n'existe pas, on peut la créer
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
                          },
                        })
                        .then(() => console.log(`Prestation importée : ${prestation}`))
                        .catch((err) =>
                          console.error(`Erreur lors de l'import de la prestation : ${err}`),
                        )
                    } else {
                      console.log(
                        `Prestation déjà existante pour ce dépôt et cette date : ${numeroPrestation}`,
                      )
                    }
                  }
                }
              })
              .catch((err) => console.error(err))
          }
          if (doc.Type === 'lieux') {
            const fileContents = await fs.readFile(filePath, 'utf-8')
            const data = JSON.parse(fileContents)

            const allGares = await req.payload.find({
              collection: 'gares',
              limit: 10000, // adapte selon ton volume
            })
            const codesExistants = new Set(allGares.docs.map((g) => g.code))

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
            await new Promise((resolve) => setTimeout(resolve, 500))
            /* await req.payload.update({
                            collection: 'import',
                            id: doc.id,
                            data: {
                                etat: 'imported',
                                log: `Import de ${data.length} gares réussi.`,
                            },
                        }); */
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
