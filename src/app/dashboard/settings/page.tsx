'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Save, User, Building2, Bell, Shield, Loader2,
  Link2, Copy, Check, CreditCard, Sparkles, Calendar,
  AlertCircle, X, Trash2, CheckCircle2,
} from 'lucide-react'
import { PASSWORD_HINT_IT, validatePasswordStrength } from '@/lib/password-policy'

type ProfileForm = {
  name: string
  email: string
  phone: string
  specialization: string
  albo_registration: string
  fiscal_code: string
  clinic: string
  address: string
}

const emptyProfile: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  specialization: '',
  albo_registration: '',
  fiscal_code: '',
  clinic: '',
  address: '',
}

// Step del modal: 'confirm' → 'feedback' → 'done'
type CancelStep = 'confirm' | 'feedback' | 'done'

export default function SettingsPage() {
  const router = useRouter()
  const { doctor, loading: authLoading, updateProfile, user } = useAuth()
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Cancellazione abbonamento
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelStep, setCancelStep] = useState<CancelStep>('confirm')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // Sincronizzazione abbonamento
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const handleSyncSubscription = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore sincronizzazione')
      setSyncMessage(data.message || 'Abbonamento sincronizzato')
      window.location.reload()
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : 'Errore durante la sincronizzazione')
    } finally {
      setSyncLoading(false)
    }
  }

  useEffect(() => {
    if (!doctor) return
    setProfile({
      name: doctor.name ?? '',
      email: doctor.email ?? '',
      phone: doctor.phone ?? '',
      specialization: doctor.specialization ?? '',
      albo_registration: doctor.albo_registration ?? '',
      fiscal_code: doctor.fiscal_code ?? '',
      clinic: doctor.clinic ?? '',
      address: doctor.address ?? '',
    })
  }, [doctor])

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      await updateProfile(profile)
      setMessage({ type: 'ok', text: 'Impostazioni salvate correttamente.' })
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Errore durante il salvataggio',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwdMessage(null)
    if (!pwdNew || !pwdCurrent) {
      setPwdMessage({ type: 'err', text: 'Compila password attuale e nuova password.' })
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMessage({ type: 'err', text: 'Le nuove password non coincidono.' })
      return
    }
    const pwdCheck = validatePasswordStrength(pwdNew)
    if (!pwdCheck.ok) {
      setPwdMessage({ type: 'err', text: pwdCheck.error })
      return
    }
    if (!user) {
      setPwdMessage({ type: 'err', text: 'Sessione non valida. Effettua di nuovo il login.' })
      return
    }
    setPwdLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Cambio password non riuscito')
      setPwdMessage({ type: 'ok', text: 'Password aggiornata.' })
      setPwdCurrent('')
      setPwdNew('')
      setPwdConfirm('')
    } catch (e) {
      setPwdMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Errore durante il cambio password',
      })
    } finally {
      setPwdLoading(false)
    }
  }

  // Step 1 → Step 2: chiama l'API e poi mostra il form feedback
  const handleConfirmCancel = async () => {
    setCancelError(null)
    setCancelLoading(true)
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore durante la cancellazione')
      setCancelStep('feedback')
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Errore durante la cancellazione')
    } finally {
      setCancelLoading(false)
    }
  }

  // Step 2 → Step 3: invia feedback (facoltativo) poi mostra done
  const handleSubmitFeedback = async () => {
    setFeedbackLoading(true)
    try {
      if (feedbackText.trim()) {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: feedbackText.trim() }),
        })
        if (!res.ok) {
          console.warn('Feedback non inviato:', res.status)
        }
      }
    } catch (e) {
      console.warn('Feedback error:', e)
    } finally {
      setFeedbackLoading(false)
      setCancelStep('done')
    }
  }

  const closeCancelModal = () => {
    setShowCancelModal(false)
    if (cancelStep === 'feedback' || cancelStep === 'done') {
      window.location.reload()
    } else {
      setCancelStep('confirm')
      setCancelError(null)
      setFeedbackText('')
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-medical-600" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-gray-600">
          Profilo medico non trovato. Se ti sei appena registrato, riprova tra un attimo o contatta il supporto.
        </p>
      </div>
    )
  }

  const isSubscriptionActive =
    (doctor?.subscription_status === 'active' || doctor?.subscription_status === 'trialing' || !!doctor?.stripe_subscription_id) &&
    !doctor?.cancel_at_period_end

  const periodEndFormatted = doctor?.current_period_end
    ? new Date(doctor.current_period_end).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-500 mt-1">Configura il tuo profilo e le preferenze</p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Profilo ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" />
            <CardTitle>Profilo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
            <Input
              label="Telefono"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
            <Input
              label="Specializzazione"
              value={profile.specialization}
              onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
            />
            <Input
              label="Iscrizione Albo (OMceo)"
              value={profile.albo_registration}
              onChange={(e) => setProfile({ ...profile, albo_registration: e.target.value })}
            />
            <Input
              label="Codice fiscale (medico)"
              value={profile.fiscal_code}
              onChange={(e) =>
                setProfile({ ...profile, fiscal_code: e.target.value.toUpperCase() })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Studio Medico ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <CardTitle>Studio Medico</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Studio"
              value={profile.clinic}
              onChange={(e) => setProfile({ ...profile, clinic: e.target.value })}
            />
            <Input
              label="Indirizzo"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" loading={saving}>
        <Save className="w-4 h-4" />
        Salva profilo
      </Button>

      {/* ── Gestisci abbonamento ──────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <CardTitle>Gestisci abbonamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Piano */}
          <div className="flex items-center gap-4 p-4 bg-primary-50 border border-primary-100 rounded-xl">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Piano Professionale</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Visite illimitate · Documenti illimitati · Inbox pazienti
              </p>
            </div>
          </div>

          {/* Date e costo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data attivazione</p>
              <p className="text-sm font-medium text-gray-900">
                {doctor?.created_at
                  ? new Date(doctor.created_at).toLocaleDateString('it-IT')
                  : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                {doctor?.cancel_at_period_end ? 'Scadenza accesso' : 'Prossimo rinnovo'}
              </p>
              <p className="text-sm font-medium text-gray-900">{periodEndFormatted}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Costo</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <Calendar className="w-4 h-4 text-primary-600" />
                49 €/mese
              </div>
            </div>
          </div>

          {/* Banner cancellazione programmata */}
          {doctor?.cancel_at_period_end && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Cancellazione programmata. L'accesso resterà attivo fino al{' '}
                <strong>{periodEndFormatted}</strong>.
              </p>
            </div>
          )}

          {/* Bottone cancellazione */}
          {isSubscriptionActive ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                setCancelStep('confirm')
                setCancelError(null)
                setFeedbackText('')
                setShowCancelModal(true)
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancella abbonamento
            </Button>
          ) : !doctor?.subscription_status || doctor?.subscription_status === 'canceled' || doctor?.subscription_status === 'inactive' ? (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-medium mb-1">Abbonamento non attivo</p>
              {doctor?.subscription_status ? (
                <p className="mb-3">Stato: <strong>{doctor.subscription_status}</strong></p>
              ) : doctor?.stripe_customer_id ? (
                <>
                  <p className="mb-2 text-gray-500">Trovato account Stripe ma nessun abbonamento collegato.</p>
                  {syncMessage && (
                    <p className="mb-2 text-xs text-amber-600">{syncMessage}</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-2"
                    loading={syncLoading}
                    onClick={handleSyncSubscription}
                  >
                    Sincronizza abbonamento
                  </Button>
                </>
              ) : (
                <p className="mb-3 text-gray-500">Nessun abbonamento Stripe collegato al tuo account.</p>
              )}
              <Button
                type="button"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => router.push('/prova-gratuita')}
              >
                {doctor?.subscription_status ? 'Rinnova abbonamento' : 'Attiva abbonamento'}
              </Button>
            </div>
          ) : doctor?.cancel_at_period_end ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-medium mb-1">Cancellazione già programmata</p>
              <p>L'accesso resterà attivo fino al <strong>{periodEndFormatted}</strong>.</p>
            </div>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Stato abbonamento: {doctor?.subscription_status || '—'}</p>
              <p className="mt-1 text-xs text-gray-400">
                Il tasto appare solo con abbonamento attivo o in prova.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Messaggi pazienti ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gray-500" />
            <CardTitle>Messaggi dai pazienti</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Condividi il link pubblico: i pazienti inviano un messaggio senza accedere alla
            dashboard. I messaggi arrivano in <strong>Inbox pazienti</strong>.
          </p>
          {user?.id ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-xs break-all">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/c/${user.id}`
                  : `/c/${user.id}`}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const url =
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/c/${user!.id}`
                      : ''
                  await navigator.clipboard.writeText(url)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copia link
              </Button>
            </div>
          ) : (
            <p className="text-amber-800">Sessione non disponibile.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Sicurezza ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <CardTitle>Sicurezza</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password attuale"
              type="password"
              autoComplete="current-password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
            />
            <Input
              label="Nuova password"
              type="password"
              autoComplete="new-password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
            />
          </div>
          <Input
            label="Conferma nuova password"
            type="password"
            autoComplete="new-password"
            value={pwdConfirm}
            onChange={(e) => setPwdConfirm(e.target.value)}
          />
          <p className="text-xs text-gray-500">{PASSWORD_HINT_IT}</p>
          {pwdMessage && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                pwdMessage.type === 'ok'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {pwdMessage.text}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">I tuoi dati sono protetti e conformi al GDPR.</p>
            <Button
              type="button"
              variant="secondary"
              loading={pwdLoading}
              onClick={handleChangePassword}
            >
              Aggiorna password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Notifiche ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <CardTitle>Notifiche</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            La campanella in alto mostra i <strong>messaggi non letti</strong> nell'Inbox. Le
            opzioni seguenti sono dimostrative; le integrazioni email/push non sono ancora attive.
          </p>
          {[
            { label: 'Notifiche email nuovi messaggi', checked: true },
            { label: 'Promemoria visite', checked: true },
            { label: 'Report settimanali', checked: false },
          ].map(({ label, checked }) => (
            <label key={label} className="flex items-center justify-between gap-4">
              <span className="text-gray-700 text-sm">{label}</span>
              <input
                type="checkbox"
                defaultChecked={checked}
                disabled
                className="w-5 h-5 rounded flex-shrink-0"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════
          MODAL CANCELLAZIONE — 3 step
      ══════════════════════════════════════════════════ */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">

            {/* ── Step 1: Avviso + 2 bottoni ── */}
            {cancelStep === 'confirm' && (
              <>
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ci dispiace che te ne vai
                  </h3>
                  <button
                    onClick={closeCancelModal}
                    className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0"
                    aria-label="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-5">
                  Prima di andartene ti consigliamo di{' '}
                  <strong>scaricare i documenti generati</strong> e tutte le altre informazioni
                  del tuo account. Dopo la cancellazione, l'accesso resterà attivo fino al{' '}
                  <strong>{periodEndFormatted}</strong>.
                </p>

                {cancelError && (
                  <div className="mb-4 text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    {cancelError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push('/dashboard/documents')}
                  >
                    Vai all'archivio
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                    loading={cancelLoading}
                    onClick={handleConfirmCancel}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Cancella abbonamento
                  </Button>
                </div>
              </>
            )}

            {/* ── Step 2: Feedback (dopo cancellazione avvenuta) ── */}
            {cancelStep === 'feedback' && (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Abbonamento cancellato</h3>
                  <button
                    onClick={closeCancelModal}
                    className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0"
                    aria-label="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    L'accesso resterà attivo fino al <strong>{periodEndFormatted}</strong>.
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  Vuoi dirci perché hai deciso di andartene? Il tuo feedback ci aiuta a
                  migliorare (facoltativo).
                </p>

                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Scrivi qui il tuo feedback…"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeCancelModal}
                    disabled={feedbackLoading}
                  >
                    Salta
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    loading={feedbackLoading}
                    onClick={handleSubmitFeedback}
                  >
                    Invia feedback
                  </Button>
                </div>
              </>
            )}

            {/* ── Step 3: Conferma finale ── */}
            {cancelStep === 'done' && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Grazie per il tuo feedback!
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Ci impegneremo a migliorare. L'account resterà attivo fino al{' '}
                  <strong>{periodEndFormatted}</strong>.
                </p>
                <Button type="button" className="w-full" onClick={closeCancelModal}>
                  Chiudi
                </Button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
