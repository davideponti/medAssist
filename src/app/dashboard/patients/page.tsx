'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Users, Phone, Mail, UserPlus, X, Loader2 } from 'lucide-react'
import type { Patient } from '@/lib/patient-types'
import { filterPatientsByQuery } from '@/lib/patient-types'

const emptyForm = {
  name: '',
  age: '' as string | number,
  phone: '',
  email: '',
  lastVisit: '',
  diagnosis: '',
  medications: '',
}

export default function PatientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadPatients = useCallback(async () => {
    setListError(null)
    try {
      const res = await fetch('/api/patients', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Caricamento non riuscito')
      }
      setPatients(data.patients ?? [])
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Errore')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPatients()
  }, [loadPatients])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])

  const filtered = useMemo(() => filterPatientsByQuery(patients, search), [patients, search])

  const updateUrl = (q: string) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    const s = params.toString()
    router.replace(s ? `/dashboard/patients?${s}` : '/dashboard/patients', { scroll: false })
  }

  const openModal = () => {
    setForm({
      ...emptyForm,
      lastVisit: new Date().toISOString().slice(0, 10),
    })
    setModalOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const ageNum = typeof form.age === 'string' ? parseInt(form.age, 10) : form.age
      const res = await fetch('/api/patients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number.isFinite(ageNum) ? ageNum : undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          lastVisit: form.lastVisit || undefined,
          diagnosis: form.diagnosis || undefined,
          medications: form.medications || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Salvataggio non riuscito')
      }
      await loadPatients()
      window.dispatchEvent(new Event('medassist-patients-updated'))
      setModalOpen(false)
      setForm(emptyForm)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pazienti</h1>
          <p className="text-gray-500">
            Opzione dimostrativa; integrazione email non ancora collegata.
          </p>
        </div>
        <Button type="button" onClick={openModal} className="flex-shrink-0" disabled={loading}>
          <UserPlus className="w-4 h-4" />
          Nuovo paziente
        </Button>
      </div>

      {listError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
          <strong>Database:</strong> {listError}. Esegui{' '}
          <code className="bg-white px-1 rounded">supabase/migrations/005_patients.sql</code> nel SQL Editor di Supabase.
        </div>
      )}

      <div className="max-w-md">
        <Input
          placeholder="Cerca..."
          value={search}
          onChange={(e) => {
            const v = e.target.value
            setSearch(v)
            updateUrl(v)
          }}
          aria-label="Cerca pazienti"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-medical-600" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600 text-sm">
          {search.trim()
            ? `Nessun risultato per "${search.trim()}".`
            : 'Nessun paziente ancora. Clicca "Nuovo paziente" per aggiungerne uno.'}
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{patient.name}</h3>
                      <p className="text-sm text-gray-500">
                        {patient.age != null ? `${patient.age} anni` : 'Età non indicata'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 whitespace-nowrap flex-shrink-0">
                    Ultima visita:{' '}
                    {patient.lastVisit
                      ? new Date(patient.lastVisit).toLocaleDateString('it-IT')
                      : '—'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {patient.phone || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {patient.email || '—'}
                  </div>
                  <div className="pt-2 border-t border-gray-100 mt-3">
                    <p className="text-gray-500">
                      <span className="font-medium text-gray-700">Diagnosi:</span>{' '}
                      {patient.diagnosis || '—'}
                    </p>
                    <p className="text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">Farmaci:</span>{' '}
                      {patient.medications || '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-patient-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="new-patient-title" className="text-lg font-semibold text-gray-900">
                Nuovo paziente
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <Input
                label="Nome e cognome"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder=""
              />
              <Input
                label="Età"
                type="number"
                min={0}
                max={130}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                placeholder=""
              />
              <Input
                label="Telefono"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder=""
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder=""
              />
              <Input
                label="Ultima visita"
                type="date"
                value={form.lastVisit}
                onChange={(e) => setForm((f) => ({ ...f, lastVisit: e.target.value }))}
              />
              <Textarea
                label="Diagnosi / note cliniche"
                rows={2}
                value={form.diagnosis}
                onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
                placeholder=""
              />
              <Textarea
                label="Farmaci in uso"
                rows={2}
                value={form.medications}
                onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))}
                placeholder=""
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" loading={saving}>
                  Salva paziente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
