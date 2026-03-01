import type { CollectionConfig } from 'payload'
import path from 'path'
import { runPrestationsImport } from './importPrestations'
import { runLieuxImport } from './importLieux'

// Heavy parsing lives in lib/odt. Keep this file focused on orchestration.

export const Import: CollectionConfig = {
  slug: 'import',
  labels: {
    singular: 'Import',
    plural: 'Imports',
  },
  upload: true,
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      label: 'Nom',
      type: 'text',
      admin: {
        condition: (data) => {
          if (data.name) {
            return true
          } else {
            return false
          }
        },
      },
    },
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
      name: 'importProgress',
      label: 'Progression import',
      type: 'ui',
      admin: {
        components: {
          Field: './admin/components/ImportProgress',
        },
      },
    },
    {
      name: 'log',
      type: 'textarea',
      admin: { readOnly: true },
    },
    {
      name: 'numberOfPrestations',
      label: 'Nombre de prestations',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'numberOfPrestationsTraited',
      label: 'Nombre de prestations traité',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'numberOfServices',
      label: 'Nombre de services',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'numberOfServicesTraited',
      label: 'Nombre de services traité',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'amplitudedepot',
      label: 'Moyenne amplitude du dépot',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'drivedepot',
      label: 'Moyenne drive du dépot',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'hlpdepot',
      label: 'Moyenne HLP du dépot',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'resdepot',
      label: 'Moyenne réserve du dépot',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'statsSeriePeriode',
      label: 'Stats série / période',
      type: 'array',
      admin: { readOnly: true, hidden: true },
      fields: [
        { name: 'serie', type: 'text' },
        { name: 'periode', type: 'text' },
        { name: 'count', type: 'number' },
        { name: 'countPrestations', type: 'number' },
        { name: 'totalDrive', type: 'number' },
        { name: 'totalReserve', type: 'number' },
        { name: 'totalHLP', type: 'number' },
        { name: 'totalActif', type: 'number' },
        { name: 'totalAmplitude', type: 'number' },
        { name: 'avgDrive', type: 'number' },
        { name: 'avgReserve', type: 'number' },
        { name: 'avgHLP', type: 'number' },
        { name: 'avgActif', type: 'number' },
        { name: 'avgAmplitude', type: 'number' },
        { name: 'avgAmplitudePrestations', type: 'number' },
        { name: 'pctDrive', type: 'number' },
        { name: 'pctReserve', type: 'number' },
        { name: 'pctHLP', type: 'number' },
        { name: 'pctActif', type: 'number' },
      ],
    },
    {
      name: 'statsDepotPeriode',
      label: 'Stats dépôt / période',
      type: 'array',
      admin: { readOnly: true, hidden: true },
      fields: [
        { name: 'periode', type: 'text' },
        { name: 'count', type: 'number' },
        { name: 'countPrestations', type: 'number' },
        { name: 'totalDrive', type: 'number' },
        { name: 'totalReserve', type: 'number' },
        { name: 'totalHLP', type: 'number' },
        { name: 'totalActif', type: 'number' },
        { name: 'totalAmplitude', type: 'number' },
        { name: 'avgDrive', type: 'number' },
        { name: 'avgReserve', type: 'number' },
        { name: 'avgHLP', type: 'number' },
        { name: 'avgActif', type: 'number' },
        { name: 'avgAmplitude', type: 'number' },
        { name: 'avgAmplitudePrestations', type: 'number' },
        { name: 'pctDrive', type: 'number' },
        { name: 'pctReserve', type: 'number' },
        { name: 'pctHLP', type: 'number' },
        { name: 'pctActif', type: 'number' },
      ],
    },
    {
      name: 'statsDashboard',
      label: 'Statistiques',
      type: 'ui',
      admin: {
        components: {
          Field: './admin/components/StatsTabs',
        },
      },
    },
  ],

  hooks: {
    afterChange: [
      // Orchestrate import: parse ODT, extract prestations, persist, compute stats.
      async ({ doc, req }) => {
        // skip if already imported
        if (doc.etat === 'imported') return

        try {
          const filePath = path.resolve(process.cwd(), `import/${doc.filename}`)

          // Import prestations: parse livret, compute stats, persist docs.
          if (doc.Type === 'prestations') {
            await runPrestationsImport({ doc, req, filePath })
          }

          // Import locations list (gares) from JSON.
          if (doc.Type === 'lieux') {
            await runLieuxImport({ doc, req, filePath })
          }
        } catch (error) {
          console.error('Error processing import:', error)
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          const errorLog = doc?.filename
            ? `Erreur: ${errorMessage}
Fichier: ${doc.filename}`
            : `Erreur: ${errorMessage}`
          await req.payload.update({
            collection: 'import',
            id: doc.id,
            data: {
              etat: 'error',
              log: errorLog,
            },
          })
        }
      },
    ],
  },
}
