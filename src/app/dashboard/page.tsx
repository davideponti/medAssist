'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Mic, Inbox, Users, CalendarDays, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { loadVisits, type StoredVisit } from '@/lib/visits-storage'
import type { PatientMessageRow } from '@/lib/inbox-types'
import type { Patient } from '@/lib/patient-types'

export default function DashboardPage() {
  const { doctor } = useAuth()
  const greetingName = doctor?.name?.trim() || 'dottore'
  const [visits, setVisits] = useState<StoredVisit[]>([])
  const [messages, setMessages] = useState<PatientMessageRow[]>([])
  const [patientsCount, setPatientsCount] = useState(0)
  const [visitsExpanded, setVisitsExpanded] = useState(false)
  const [inboxExpanded, setInboxExpanded] = useState(false)

  const [stripeSuccess, setStripeSuccess] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const stripe = url.searchParams.get('stripe')
    const error = url.searchParams.get('error')
    if (stripe === 'success') {
      setStripeSuccess(true)
    }
    if (error) {
      setStripeError(error)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const refreshVisits = async () => {
      const list = await loadVisits()
      if (mounted) setVisits(list)
    }
    void refreshVisits()
    const onUpd = () => { void refreshVisits() }
    window.addEventListener('medassist-visits-updated', onUpd)
    return () => {
      mounted = false
      window.removeEventListener('medassist-visits-updated', onUpd)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/inbox/messages', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (mounted) setMessages(data.messages ?? [])
      } catch {
        /* ignore */
      }
    }
    void fetchMessages()
    const id = window.setInterval(() => void fetchMessages(), 10000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        const patients = (data.patients ?? []) as Patient[]
        if (mounted) setPatientsCount(patients.length)
      } catch {
        /* ignore */
      }
    }
    void fetchPatients()
    const id = window.setInterval(() => void fetchPatients(), 15000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [])

  const unread = messages.filter((m) => !m.read_at).length
  const visitsVisible = visitsExpanded ? visits : visits.slice(0, 3)
  const messagesVisible = inboxExpanded ? messages : messages.slice(0, 3)

  return (
    <div className="space-y-6">
      {stripeSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-900">
            <p className="font-medium">Grazie, pagamento ricevuto.</p>
            <p className="mt-0.5">
              La prova gratuita di 7 giorni del piano Professionale è stata attivata. Potrai gestire l&apos;abbonamento
              e la disdetta direttamente dall&apos;area di fatturazione Stripe.
            </p>
          </div>
        </div>
      )}

      {stripeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-medium">Pagamento non completato.</p>
            <p className="mt-0.5">
              {stripeError || 'Il pagamento è stato annullato o non autorizzato. Puoi riprovare in qualsiasi momento.'}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Buongiorno, {greetingName}</p>
        </div>
        <Link href="/dashboard/visits/new">
          <Button>
            <Mic className="w-4 h-4" />
            Nuova Visita
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat
          icon={CalendarDays}
          label="Visite registrate"
          value={String(visits.length)}
          color="bg-medical-100 text-medical-600"
        />
        <MiniStat
          icon={Inbox}
          label="Messaggi ricevuti"
          value={String(messages.length)}
          color="bg-primary-100 text-primary-600"
        />
        <MiniStat
          icon={Mic}
          label="Messaggi non letti"
          value={String(unread)}
          color="bg-amber-100 text-amber-600"
        />
        <MiniStat
          icon={Users}
          label="Pazienti"
          value={String(patientsCount)}
          color="bg-green-100 text-green-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visite Recenti</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[320px]">
            {visitsVisible.length === 0 ? (
              <p className="text-sm text-gray-500">Nessuna visita recente.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {visitsVisible.map((v) => (
                  <VisitRow
                    key={v.id}
                    patient={v.title?.trim() || v.patientContext?.split('\n')[0] || 'Visita'}
                    time={new Date(v.createdAt).toLocaleString('it-IT')}
                    diagnosis={v.clinicalNote.assessment || '—'}
                  />
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setVisitsExpanded((v) => !v)}
                disabled={visits.length <= 3}
              >
                {visitsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {visitsExpanded ? 'Riduci' : 'Espandi'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbox Pazienti {unread > 0 ? `(${unread} non letti)` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[320px]">
            {messagesVisible.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun messaggio recente.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {messagesVisible.map((m) => (
                  <InboxRow
                    key={m.id}
                    patient={m.patient_name}
                    message={m.body}
                    time={new Date(m.created_at).toLocaleString('it-IT')}
                  />
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setInboxExpanded((v) => !v)}
                disabled={messages.length <= 3}
              >
                {inboxExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {inboxExpanded ? 'Riduci' : 'Espandi'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function VisitRow({ patient, time, diagnosis }: { patient: string; time: string; diagnosis: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{patient}</p>
        <p className="text-sm text-gray-500">{diagnosis}</p>
      </div>
      <span className="text-sm text-gray-400">{time}</span>
    </div>
  )
}

function InboxRow({ patient, message, time }: { patient: string; message: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{patient}</p>
        <p className="text-sm text-gray-500 truncate">{message}</p>
      </div>
      <span className="text-sm text-gray-400 ml-4">{time}</span>
    </div>
  )
}
