export type ClinicalNoteStored = {
  subjective: string
  objective: string
  assessment: string
  plan: string
  summary: string
}

export type StoredVisit = {
  id: string
  createdAt: string
  patientContext: string
  transcription: string
  clinicalNote: ClinicalNoteStored
}

const KEY = 'medassist_visits'

function safeParse(json: string | null): StoredVisit[] {
  if (!json) return []
  try {
    const data = JSON.parse(json) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(
      (v): v is StoredVisit =>
        typeof v === 'object' &&
        v !== null &&
        'id' in v &&
        'transcription' in v &&
        'clinicalNote' in v
    )
  } catch {
    return []
  }
}

export function loadVisits(): StoredVisit[] {
  if (typeof window === 'undefined') return []
  return safeParse(window.localStorage.getItem(KEY)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function saveVisit(entry: Omit<StoredVisit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): StoredVisit {
  const visit: StoredVisit = {
    id: entry.id ?? crypto.randomUUID(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    patientContext: entry.patientContext,
    transcription: entry.transcription,
    clinicalNote: entry.clinicalNote,
  }
  const current = loadVisits()
  const without = current.filter((v) => v.id !== visit.id)
  const next = [visit, ...without]
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return visit
}
