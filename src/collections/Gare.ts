import type { CollectionConfig } from 'payload'

export const Gare: CollectionConfig = {
    slug: 'gares',
    labels: {
        singular: 'Gare',
        plural: 'Gares',
    },
    admin: {
        useAsTitle: 'garefr',
        defaultColumns: ['garefr', 'garenl', 'code'],
        listSearchableFields: ['garefr', 'garenl', 'code'],

    },
    fields: [
        {
            name: 'garefr',
            type: 'text',
            required: true,
            label: 'Gare FR',
        },
        {
            name: 'garenl',
            type: 'text',
            required: true,
            label: 'Gare NL',
        },
        {
            name: 'code',
            type: 'text',
            required: true,
        },
        {
            name: 'depot',
            type: 'checkbox',
            label: 'Dépôt',
            defaultValue: false,
        },
        {
            name: 'seriesDepot',
            label: 'Série du dépôt',
            type: 'array',
            admin: {
                condition: (data) => Boolean(data.depot),
            },
            fields: [
                {
                    name: 'serie',
                    type: 'text',
                    required: true,
                    label: 'Série',
                }
            ],
        }
    ],
}