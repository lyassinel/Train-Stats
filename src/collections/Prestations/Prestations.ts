import type { CollectionConfig } from 'payload'

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
            name: 'amplitude',
            type: 'text',
            required: true,
        }
    ],
}