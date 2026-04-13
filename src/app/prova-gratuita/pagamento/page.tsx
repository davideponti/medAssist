'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, ShieldCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function formatTrialEndIt(d: Date): string {
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PagamentoProvaPage() {
  const trialEnd = useMemo(() => addDays(new Date(), 7), [])
  const trialEndLabel = useMemo(() => formatTrialEndIt(trialEnd), [trialEnd])

  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('canceled') === '1') setCanceled(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Impossibile avviare il pagamento.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Connessione non riuscita. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50">
      <div className="max-w-lg mx-auto px-6 py-10">
        <Link
          href="/prova-gratuita"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla scelta del piano
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Attivazione piano Professionale</h1>
        </div>
        <p className="text-gray-600 text-sm mb-8">
          Il pagamento avviene in modo sicuro tramite <strong>Stripe</strong>. Al termine sarete reindirizzati alla
          registrazione per completare l&apos;account dello studio.
        </p>

        {canceled && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pagamento annullato. Potete riprovare quando volete.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Informativa sul periodo di prova</h2>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed text-justify">
                Con l&apos;invio del presente modulo Lei richiede l&apos;attivazione del <strong>piano Professionale</strong>{' '}
                (canone mensile di <strong>€ 49,00</strong>, IVA e altri oneri secondo quanto indicato in fattura o nelle
                condizioni commerciali applicabili), con <strong>periodo di prova gratuito di 7 (sette) giorni</strong>{' '}
                naturali e consecutivi.
              </p>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed text-justify">
                La prova gratuita <strong>si intenderà conclusa in data {trialEndLabel}</strong>. Decorsa tale data, salvo
                comunicazione di recesso inviata nei modi e nei termini previsti dalle Condizioni generali di contratto,
                l&apos;abbonamento si rinnoverà automaticamente a cadenza mensile e l&apos;importo dovuto sarà
                <strong> addebitato sul mezzo di pagamento da Lei indicato</strong> (tramite Stripe), fino a disdetta.
              </p>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed text-justify">
                Lei potrà <strong>annullare l&apos;iscrizione prima della scadenza del periodo di prova</strong>, nonché
                recedere dal contratto successivamente, secondo le modalità di legge e di contratto, con le eccezioni e i
                termini di preavviso ivi stabiliti.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            Pagamento con Stripe
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Cliccando sul pulsante aprirete la pagina sicura di Stripe per inserire i dati della carta o altri metodi
            supportati. Non memorizziamo i numeri di carta sui nostri server.
          </p>

          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="text-sm text-gray-700 leading-snug">
              Ho letto e accetto i{' '}
              <Link href="/termini-e-condizioni" target="_blank" className="underline text-primary-700">
                Termini e Condizioni
              </Link>{' '}
              e la{' '}
              <Link href="/privacy-policy" target="_blank" className="underline text-primary-700">
                Privacy Policy
              </Link>
              . Confermo inoltre che, salvo disdetta tempestiva, decorso il {trialEndLabel} si applichera il canone
              mensile di EUR 49,00.
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={!accepted || busy} loading={busy}>
            Inizia prova gratuita
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-8">
          I pagamenti sono elaborati da Stripe. Per la messa in produzione configurare le chiavi API e il prezzo
          ricorrente nella dashboard Stripe e nelle variabili d&apos;ambiente del progetto.
        </p>
      </div>
    </main>
  )
}
