// app/api/stats/route.ts
import { cache } from 'react'

export const getStats = cache(async (depot?: string, date?: string, serie?: string) => {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/prestations`)
    if (depot) url.searchParams.set('depot', depot)
    if (date) url.searchParams.set('date', date)
    if (serie) url.searchParams.set('serie', serie)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error('Erreur API')

    const data = await res.json()
    // ici tu fais tes calculs de moyennes et renvoies le format StatRow[]
    return data
})

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const depot = searchParams.get('depot') || undefined
    const date = searchParams.get('date') || undefined
    const serie = searchParams.get('serie') || undefined

    const stats = await getStats(depot, date, serie)
    return Response.json(stats)
}
