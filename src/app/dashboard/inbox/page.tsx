'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, Copy, Check, AlertCircle, Link2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import type { PatientMessageRow } from '@/lib/inbox-types'

export default function InboxPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<PatientMessageRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [patientContext, setPatientContext] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [manualReply, setManualReply] = useState('')
  const [savingManual, setSavingManual] = useState(false)
  const [copied, setCopied] = useState(false)

  const selected = selectedId ? messages.find((m) => m.id === selectedId) ?? null : null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingList(true)
      setListError(null)
      try {
        const res = await fetch('/api/inbox/messages', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'Caricamento non riuscito')
        }
        const list = (data.messages ?? []) as PatientMessageRow[]
        if (!cancelled) setMessages(list)
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : 'Errore')
          setMessages([])
        }
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selectedId && !messages.some((m) => m.id === selectedId)) {
      setSelectedId(null)
    }
  }, [messages, selectedId])

  useEffect(() => {
    if (!selected) {
      setManualReply('')
      return
    }
    setManualReply(selected.doctor_reply ?? '')
  }, [selected])

  const markRead = async (msg: PatientMessageRow) => {
    if (msg.read_at) return
    try {
      await fetch(`/api/inbox/messages/${msg.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markRead: true }),
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
      )
      window.dispatchEvent(new Event('medassist-inbox-updated'))
    } catch {
      /* ignore */
    }
  }

  const onSelect = (msg: PatientMessageRow) => {
    setSelectedId(msg.id)
    void markRead(msg)
  }

  const generateResponse = async (msg: PatientMessageRow) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.body,
          patientContext: patientContext || undefined,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      await fetch(`/api/inbox/messages/${msg.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_suggested_reply: data.response,
          suggested_action: data.suggestedAction ?? null,
        }),
      })

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                ai_suggested_reply: data.response,
                suggested_action: data.suggestedAction ?? null,
              }
            : m
        )
      )
    } catch (error) {
      console.error('Error generating response:', error)
      alert('Errore durante la generazione. Riprova.')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveManualReply = async () => {
    if (!selected) return
    setSavingManual(true)
    try {
      const res = await fetch(`/api/inbox/messages/${selected.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_reply: manualReply }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Salvataggio non riuscito')
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === selected.id ? { ...m, doctor_reply: manualReply || null } : m))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSavingManual(false)
    }
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl =
    typeof window !== 'undefined' && user?.id
      ? `${window.location.origin}/c/${user.id}`
      : ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox Pazienti</h1>
        <p className="text-gray-500">
          I messaggi inviati dai pazienti tramite il tuo link pubblico compaiono qui. Le notifiche in alto mostrano i messaggi non letti (nessun push sul telefono finché non integri un servizio di notifiche).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Link per ricevere messaggi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Condividi questo indirizzo con i pazienti (sito, email, QR). Il paziente compila il modulo senza accedere alla tua dashboard.
          </p>
          {shareUrl ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-xs break-all">{shareUrl}</code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void copyText(shareUrl)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copia
              </Button>
            </div>
          ) : (
            <p className="text-amber-800">Accedi per vedere il link.</p>
          )}
          <p className="text-xs text-gray-500">
            Richiede la tabella <code className="bg-gray-100 px-1 rounded">patient_messages</code> su Supabase (migration 004).
          </p>
          <Link href="/dashboard/settings" className="text-primary-600 text-sm font-medium hover:underline">
            Anche in Impostazioni →
          </Link>
        </CardContent>
      </Card>

      {listError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
          <strong>Database:</strong> {listError}. Esegui{' '}
          <code className="bg-white px-1 rounded">supabase/migrations/004_patient_messages.sql</code> nel SQL Editor di Supabase.
        </div>
      )}

      {loadingList ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-medical-600" />
        </div>
      ) : messages.length === 0 && !listError ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            <p className="mb-2">Non ci sono ancora messaggi.</p>
            <p className="text-sm">Condividi il link sopra con i tuoi pazienti.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            {messages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => onSelect(msg)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedId === msg.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="font-medium text-gray-900 truncate">{msg.patient_name}</p>
                  {!msg.read_at && (
                    <span className="flex-shrink-0 w-2 h-2 bg-medical-500 rounded-full" title="Non letto" />
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{msg.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(msg.created_at).toLocaleString('it-IT')}
                </p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2">
            {selected ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{selected.patient_name}</CardTitle>
                      <span className="text-sm text-gray-400 whitespace-nowrap">
                        {new Date(selected.created_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{selected.body}</p>
                    {selected.patient_email && (
                      <p className="text-sm text-gray-500 mt-2">Email: {selected.patient_email}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risposta manuale</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Scrivi la risposta che invierai al paziente (email, WhatsApp, portale…)."
                      value={manualReply}
                      onChange={(e) => setManualReply(e.target.value)}
                      rows={5}
                    />
                    <Button type="button" onClick={() => void saveManualReply()} loading={savingManual}>
                      <Save className="w-4 h-4" />
                      Salva risposta manuale
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contesto clinico (opzionale, per l&apos;AI)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Storia clinica, farmaci, note precedenti…"
                      value={patientContext}
                      onChange={(e) => setPatientContext(e.target.value)}
                      rows={2}
                    />
                  </CardContent>
                </Card>

                <Button
                  type="button"
                  onClick={() => void generateResponse(selected)}
                  loading={isGenerating}
                  className="w-full"
                  variant="secondary"
                >
                  <Send className="w-4 h-4" />
                  Genera bozza risposta con AI
                </Button>

                {selected.ai_suggested_reply && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Bozza AI</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void copyText(selected.ai_suggested_reply!)}
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                        {selected.ai_suggested_reply}
                      </p>

                      {selected.suggested_action && (
                        <div className="mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Azione suggerita</p>
                            <p className="text-sm text-amber-700">{selected.suggested_action}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">Seleziona un messaggio</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
