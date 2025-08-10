import type { CollectionConfig } from 'payload'
import { array } from 'payload/shared'

export const Prestations: CollectionConfig = {
    slug: 'prestations',
    labels: {
        singular: 'Prestation',
        plural: 'Prestations',
    },
    fields: [
        {
            name: 'name',
            label: 'Numéro de la prestation',
            type: 'text',
            required: true,
        },
        {
            name: 'depot',
            label: 'Dépôt',
            type: 'relationship',
            relationTo: 'gares',
            required: true,

        },
        {
            name: 'date',
            label: 'Date d\'application',
            type: 'date',
            required: true,
            admin: {
                date: {
                    pickerAppearance: 'dayOnly',
                    displayFormat: 'dd/MM/yyyy',
                },
            },
        },
        {
            name: 'periode',
            label: 'Période',
            type: 'text',
            required: true,
        },
        {
            type: 'row',
            fields: [{
                name: 'heureDebut',
                type: 'text',
                required: true,
                admin: {
                    width: '50%',
                },
            },
            {
                name: 'heureFin',
                type: 'text',
                required: true,
                admin: {
                    width: '50%',
                },
            },],
        },
        {
            name: 'roulement',
            label: 'Roulement',
            type: 'array',
            fields: [
                {
                    type: 'text',
                    name: 'serie',
                    label: 'Série',
                },
                {
                    type: 'text',
                    name: 'semaine',
                    label: 'Semaine',
                },
                {
                    type: 'text',
                    name: 'jour',
                    label: 'Jour',
                },
                {
                    type: 'text',
                    name: 'periode',
                    label: 'Période',
                }
            ]
        },

        {
            name: 'amplitude',
            type: 'text',
            required: true,
            admin: {
                readOnly: true,
            },
            label: 'Amplitude',
        },
        {
            name: 'amplitudeMin',
            type: 'number',
            label: 'Amplitude en minutes',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'tempsConduite',
            type: 'number',
            label: 'Temps de conduite',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'tempsActif',
            type: 'number',
            label: 'Temps actif',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'tempsReserve',
            type: 'number',
            label: 'Temps de réserve',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'tempsHLP',
            type: 'number',
            label: 'Temps HLP',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'RawData',
            type: 'textarea',
            label: 'Données brutes',
            admin: {
                readOnly: true,
            },
        }
    ],
}