export type StoredDocType = 'referral' | 'letter' | 'certificate'

export type StoredGeneratedDocument = {
  id: string
  type: StoredDocType
  patientName: string
  body: string
  createdAt: string
}

const KEY = 'medassist_generated_documents'

function safeParse(): StoredGeneratedDocument[] {
  if (typeof window === 'undefined') return []
  const json = window.localStorage.getItem(KEY)
  if (!json) return []
  try {
    const data = JSON.parse(json) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((v): v is StoredGeneratedDocument => {
      if (typeof v !== 'object' || v === null) return false
      const t = (v as StoredGeneratedDocument).type
      return (
        'id' in v &&
        'patientName' in v &&
        'body' in v &&
        (t === 'referral' || t === 'letter' || t === 'certificate')
      )
    })
  } catch {
    return []
  }
}

export function loadGeneratedDocuments(): StoredGeneratedDocument[] {
  return safeParse().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function saveGeneratedDocument(doc: Omit<StoredGeneratedDocument, 'id' | 'createdAt'>): StoredGeneratedDocument {
  const row: StoredGeneratedDocument = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...doc,
  }
  const list = loadGeneratedDocuments()
  window.localStorage.setItem(KEY, JSON.stringify([row, ...list]))
  return row
}

export function docsByType(type: StoredDocType): StoredGeneratedDocument[] {
  return loadGeneratedDocuments().filter((d) => d.type === type)
}

export function searchDocuments(query: string): StoredGeneratedDocument[] {
  const q = query.trim().toLowerCase()
  if (!q) return loadGeneratedDocuments()
  return loadGeneratedDocuments().filter(
    (d) =>
      d.patientName.toLowerCase().includes(q) ||
      d.body.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
  )
}
