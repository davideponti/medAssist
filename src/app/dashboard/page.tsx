'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Mic, FileText, Inbox, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { doctor } = useAuth()
  const greetingName = doctor?.name?.trim() || 'dottore'

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

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          icon={Mic}
          label="Visite Oggi"
          value="12"
          trend="+2"
          color="bg-medical-100 text-medical-600"
        />
        <StatCard
          icon={FileText}
          label="Documenti Generati"
          value="28"
          trend="+5"
          color="bg-primary-100 text-primary-600"
        />
        <StatCard
          icon={Inbox}
          label="Messaggi Pending"
          value="8"
          trend="-3"
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={Clock}
          label="Ore Risparmiate"
          value="4.5h"
          trend="+1.2h"
          color="bg-green-100 text-green-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visite Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <VisitRow patient="Mario Rossi" time="10:30" diagnosis="Controllo diabete" />
              <VisitRow patient="Laura Bianchi" time="11:15" diagnosis="Ipertensione" />
              <VisitRow patient="Giuseppe Verdi" time="12:00" diagnosis="Dolore lombare" />
              <VisitRow patient="Anna Neri" time="14:30" diagnosis="Referral cardiologia" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbox Pazienti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InboxRow patient="Mario Rossi" message="Ho dimenticato di chiedere..." time="2h fa" />
              <InboxRow patient="Laura Bianchi" message="Risultati esami del sangue" time="5h fa" />
              <InboxRow patient="Giuseppe Verdi" message="Ricetta scaduta" time="1g fa" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  trend: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
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
