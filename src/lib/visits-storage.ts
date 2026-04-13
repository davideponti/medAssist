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
  title: string
  archived: boolean
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
    return data
      .filter(
        (v): v is Record<string, unknown> =>
          typeof v === 'object' && v !== null && 'id' in v && 'transcription' in v && 'clinicalNote' in v
      )
      .map((v) => {
        const rawTitle = typeof v.title === 'string' ? v.title.trim() : ''
        return {
          id: String(v.id),
          createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString(),
          title: rawTitle || 'Visita a... (nome)',
          archived: v.archived === true,
          patientContext: typeof v.patientContext === 'string' ? v.patientContext : '',
          transcription: typeof v.transcription === 'string' ? v.transcription : '',
          clinicalNote: v.clinicalNote as ClinicalNoteStored,
        }
      })
  } catch {
    return []
  }
}

export function loadVisits(opts?: { includeArchived?: boolean }): StoredVisit[] {
  if (typeof window === 'undefined') return []
  const includeArchived = opts?.includeArchived ?? false
  const list = safeParse(window.localStorage.getItem(KEY))
  const filtered = includeArchived ? list : list.filter((v) => !v.archived)
  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function saveVisit(entry: Omit<StoredVisit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): StoredVisit {
  const visit: StoredVisit = {
    id: entry.id ?? crypto.randomUUID(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    title: entry.title,
    archived: entry.archived ?? false,
    patientContext: entry.patientContext,
    transcription: entry.transcription,
    clinicalNote: entry.clinicalNote,
  }
  const current = loadVisits({ includeArchived: true })
  const without = current.filter((v) => v.id !== visit.id)
  const next = [visit, ...without]
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return visit
}

export function updateVisit(
  id: string,
  patch: Partial<Pick<StoredVisit, 'title' | 'archived' | 'patientContext' | 'transcription' | 'clinicalNote'>>
): StoredVisit | null {
  const current = loadVisits({ includeArchived: true })
  const existing = current.find((v) => v.id === id)
  if (!existing) return null

  const updated: StoredVisit = {
    ...existing,
    ...patch,
    clinicalNote: patch.clinicalNote ?? existing.clinicalNote,
  }

  const next = [updated, ...current.filter((v) => v.id !== id)]
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return updated
}

export function archiveVisit(id: string): StoredVisit | null {
  return updateVisit(id, { archived: true })
}

export function unarchiveVisit(id: string): StoredVisit | null {
  return updateVisit(id, { archived: false })
}

export function deleteVisit(id: string): boolean {
  const current = loadVisits({ includeArchived: true })
  const next = current.filter((v) => v.id !== id)
  if (next.length === current.length) return false
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return true
}
