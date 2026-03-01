import { ImportDoc } from '@/lib/prestations/types'
import { PayloadRequest } from 'payload'

let canUpdateImport = true
export const updateImport = async (
  data: Record<string, unknown>,
  req: PayloadRequest,
  doc: ImportDoc,
) => {
  if (!canUpdateImport || !doc?.id) return
  try {
    await req.payload.update({
      collection: 'import',
      id: doc.id,
      data,
      overrideAccess: true,
    })
  } catch (err: unknown) {
    canUpdateImport = false
    const status = (err as { status?: number })?.status
    if (status === 404) {
      console.warn('Import doc not found for progress update; skipping further updates.')
      return
    }
    console.error('Failed to update import progress:', err)
  }
}
