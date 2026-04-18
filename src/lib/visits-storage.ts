/**
 * Client per API /api/visits.
 *
 * Le visite sono persistite su Supabase con RLS (tabella public.visits),
 * NON in localStorage. Questo garantisce conformita' GDPR art. 32 per dati
 * sanitari (art. 9) su computer condivisi, extension malevole, XSS.
 */

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

const fetchOpts: RequestInit = { credentials: 'include' }

/** Carica le visite del medico loggato. Se include archived, restituisce tutte. */
export async function loadVisits(opts?: { includeArchived?: boolean }): Promise<StoredVisit[]> {
  const includeArchived = opts?.includeArchived ?? false
  const url = `/api/visits${includeArchived ? '?includeArchived=1' : ''}`
  try {
    const res = await fetch(url, { ...fetchOpts, cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json().catch(() => ({}))) as { visits?: StoredVisit[] }
    return Array.isArray(data.visits) ? data.visits : []
  } catch {
    return []
  }
}

/** Salva una nuova visita. Ritorna la visita persistita (con id generato server-side). */
export async function saveVisit(
  entry: Omit<StoredVisit, 'id' | 'createdAt'>
): Promise<StoredVisit | null> {
  try {
    const res = await fetch('/api/visits', {
      ...fetchOpts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => ({}))) as { visit?: StoredVisit }
    return data.visit ?? null
  } catch {
    return null
  }
}

/** Aggiorna una visita esistente. Ritorna true se ok. */
export async function updateVisit(
  id: string,
  patch: Partial<Pick<StoredVisit, 'title' | 'archived' | 'patientContext' | 'transcription' | 'clinicalNote'>>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/visits/${encodeURIComponent(id)}`, {
      ...fetchOpts,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function archiveVisit(id: string): Promise<boolean> {
  return updateVisit(id, { archived: true })
}

export async function unarchiveVisit(id: string): Promise<boolean> {
  return updateVisit(id, { archived: false })
}

export async function deleteVisit(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/visits/${encodeURIComponent(id)}`, {
      ...fetchOpts,
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}
