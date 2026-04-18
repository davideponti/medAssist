'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Script from 'next/script'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import { Stethoscope, Loader2, CheckCircle } from 'lucide-react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

/**
 * Turnstile API minimal type (Cloudflare). Evita il global window.onTurnstileSuccess
 * per prevenire override da script terzi.
 */
type TurnstileApi = {
  render: (
    el: HTMLElement | string,
    opts: { sitekey: string; callback: (token: string) => void }
  ) => string
  reset: (widgetId?: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export default function PublicContactPage() {
  const params = useParams()
  const doctorId = typeof params.doctorId === 'string' ? params.doctorId : ''

  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | null>(null)

  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [message, setMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Completa la verifica anti-spam.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          patientName: patientName.trim(),
          patientEmail: patientEmail.trim() || undefined,
          patientPhone: patientPhone.trim() || undefined,
          message: message.trim(),
          turnstileToken,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Invio non riuscito')
      }
      setDone(true)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-primary-50 flex items-center justify-center p-4">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => {
            // Render esplicito con callback locale (no window global)
            if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
              turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (token: string) => setTurnstileToken(token),
              })
            }
          }}
        />
      )}
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-medical-500 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Messaggio allo studio</h1>
        <p className="text-center text-gray-600 text-sm mb-8">
          Scrivi al medico che ti ha condiviso questo link. Non sostituisce urgenze né la visita: in emergenza contatta il 118 o il pronto soccorso.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuovo messaggio</CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
                <p className="text-gray-800 font-medium">Messaggio inviato.</p>
                <p className="text-sm text-gray-600">
                  Riceverai risposta secondo le modalità indicate dallo studio. Non è un servizio in tempo reale.
                </p>
                <Button type="button" variant="secondary" onClick={() => setDone(false)}>
                  Invia un altro messaggio
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Il tuo nome"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder=""
                />
                <Input
                  label="Email"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder=""
                />
                <Input
                  label="Telefono"
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder=""
                />
                <Textarea
                  label="Messaggio"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder=""
                />
                {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia messaggio'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-gray-500 text-center mt-6">
          Servizio tramite medincly. I messaggi sono destinati allo studio del medico titolare del link.
        </p>
      </div>
    </main>
  )
}
