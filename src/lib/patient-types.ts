/** Paziente come restituito dalle API (camelCase). */
export type Patient = {
  id: string
  name: string
  age: number | null
  phone: string | null
  email: string | null
  /** ISO date YYYY-MM-DD */
  lastVisit: string | null
  diagnosis: string | null
  medications: string | null
  createdAt: string
}

export function filterPatientsByQuery(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase()
  if (!q) return patients
  return patients.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q)) ||
      (p.phone && p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
  )
}
