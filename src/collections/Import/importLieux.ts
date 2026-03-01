import { ImportDoc } from '@/lib/prestations/types'
import fs from 'fs/promises'
import type { PayloadRequest } from 'payload'

type LieuRow = {
  gareFR: string
  gareNL: string
  code: string
}

/**
 * Import "lieux" from a JSON file into the gares collection.
 */
export const runLieuxImport = async ({
  doc,
  req,
  filePath,
}: {
  doc: ImportDoc
  req: PayloadRequest
  filePath: string
}) => {
  const fileContents = await fs.readFile(filePath, 'utf-8')
  const data = JSON.parse(fileContents) as LieuRow[]

  const allGares = await req.payload.find({ collection: 'gares', limit: 10000 })
  const codesExistants = new Set(
    allGares.docs.map((g) => g.code).filter((code): code is string => Boolean(code)),
  )

  for (const gare of data) {
    if (!codesExistants.has(gare.code)) {
      await req.payload.create({
        collection: 'gares',
        data: { garefr: gare.gareFR, garenl: gare.gareNL, code: gare.code },
      })
      console.log(`Gare ${gare.gareFR} importee avec succes.`)
      codesExistants.add(gare.code)
    } else {
      console.log(`Gare ${gare.gareFR} deja existante, import ignore.`)
    }
  }

  if (doc?.id) {
    await req.payload.update({
      collection: 'import',
      id: doc.id,
      data: {
        etat: 'imported',
      },
    })
  }
}
