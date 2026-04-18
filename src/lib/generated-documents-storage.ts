/**
 * Client per API /api/generated-documents.
 *
 * I documenti sono persistiti su Supabase con RLS (tabella public.generated_documents),
 * NON in localStorage. Conforme GDPR art. 32 per dati sanitari.
 */

export type StoredDocType = 'referral' | 'letter' | 'certificate'

export type StoredGeneratedDocument = {
  id: string
  type: StoredDocType
  patientName: string
  body: string
  createdAt: string
}

const fetchOpts: RequestInit = { credentials: 'include' }

export async function loadGeneratedDocuments(): Promise<StoredGeneratedDocument[]> {
  try {
    const res = await fetch('/api/generated-documents', { ...fetchOpts, cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json().catch(() => ({}))) as {
      documents?: StoredGeneratedDocument[]
    }
    return Array.isArray(data.documents) ? data.documents : []
  } catch {
    return []
  }
}

export async function saveGeneratedDocument(
  doc: Omit<StoredGeneratedDocument, 'id' | 'createdAt'>
): Promise<StoredGeneratedDocument | null> {
  try {
    const res = await fetch('/api/generated-documents', {
      ...fetchOpts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => ({}))) as { document?: StoredGeneratedDocument }
    return data.document ?? null
  } catch {
    return null
  }
}

export async function docsByType(type: StoredDocType): Promise<StoredGeneratedDocument[]> {
  try {
    const res = await fetch(`/api/generated-documents?type=${encodeURIComponent(type)}`, {
      ...fetchOpts,
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = (await res.json().catch(() => ({}))) as {
      documents?: StoredGeneratedDocument[]
    }
    return Array.isArray(data.documents) ? data.documents : []
  } catch {
    return []
  }
}

export async function searchDocuments(query: string): Promise<StoredGeneratedDocument[]> {
  // Filtro client-side per semplicita' (la lista per medico e' limitata).
  const q = query.trim().toLowerCase()
  const all = await loadGeneratedDocuments()
  if (!q) return all
  return all.filter(
    (d) =>
      d.patientName.toLowerCase().includes(q) ||
      d.body.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
  )
}
