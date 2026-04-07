'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, User, Building2, Bell, Shield, Loader2, Link2, Copy, Check } from 'lucide-react'
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

export default function SettingsPage() {
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
      await updateProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        specialization: profile.specialization,
        albo_registration: profile.albo_registration,
        fiscal_code: profile.fiscal_code,
        clinic: profile.clinic,
        address: profile.address,
      })
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: pwdCurrent,
          newPassword: pwdNew,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Cambio password non riuscito')
      }
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
          Profilo medico non trovato. Se ti sei appena registrato, riprova tra un attimo o contatta il
          supporto.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-500">Configura il tuo profilo e le preferenze</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" />
            <CardTitle>Profilo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            label="Iscrizione all'Ordine dei Medici (Albo)"
            placeholder="es. O.M. Provincia di Milano n. 12345"
            value={profile.albo_registration}
            onChange={(e) => setProfile({ ...profile, albo_registration: e.target.value })}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Comparirà nei documenti generati (referral, certificati, lettere).
          </p>
          <Input
            label="Codice fiscale (medico)"
            placeholder="es. RSSMRA80A01F205X"
            value={profile.fiscal_code}
            onChange={(e) => setProfile({ ...profile, fiscal_code: e.target.value.toUpperCase() })}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Utile per certificati e documenti ufficiali; non sostituisce sistemi di ricetta elettronica.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <CardTitle>Studio Medico</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gray-500" />
            <CardTitle>Messaggi dai pazienti</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Condividi il link pubblico: i pazienti inviano un messaggio senza accedere alla dashboard. I messaggi
            arrivano in <strong>Inbox pazienti</strong> (serve la migration <code className="bg-gray-100 px-1 rounded text-xs">004_patient_messages</code> su Supabase).
          </p>
          {user?.id ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-xs break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/c/${user.id}` : `/c/${user.id}`}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const url =
                    typeof window !== 'undefined' ? `${window.location.origin}/c/${user!.id}` : ''
                  await navigator.clipboard.writeText(url)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
              >
                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copia link
              </Button>
            </div>
          ) : (
            <p className="text-amber-800">Sessione non disponibile.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <CardTitle>Notifiche</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            La campanella in alto mostra solo i <strong>messaggi non letti</strong> in Inbox (contatore aggiornato
            aprendo l&apos;app o cliccando Inbox). Non sono notifiche push sul telefono: per quelle servirebbe
            un servizio aggiuntivo (web push, email transazionale, ecc.).
          </p>
          <label className="flex items-center justify-between gap-4">
            <span className="text-gray-700 text-sm">Notifiche email nuovi messaggi</span>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded flex-shrink-0" disabled />
          </label>
          <p className="text-xs text-gray-500">Opzione dimostrativa; integrazione email non ancora collegata.</p>
          <label className="flex items-center justify-between gap-4">
            <span className="text-gray-700 text-sm">Promemoria visite</span>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded flex-shrink-0" disabled />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-gray-700 text-sm">Report settimanali</span>
            <input type="checkbox" className="w-5 h-5 rounded flex-shrink-0" disabled />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <CardTitle>Sicurezza</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Password attuale"
            type="password"
            autoComplete="current-password"
            value={pwdCurrent}
            onChange={(e) => setPwdCurrent(e.target.value)}
          />
          <p className="text-xs text-gray-500">{PASSWORD_HINT_IT}</p>
          <Input
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            value={pwdNew}
            onChange={(e) => setPwdNew(e.target.value)}
          />
          <Input
            label="Conferma nuova password"
            type="password"
            autoComplete="new-password"
            value={pwdConfirm}
            onChange={(e) => setPwdConfirm(e.target.value)}
          />
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
          <Button
            type="button"
            variant="secondary"
            loading={pwdLoading}
            onClick={handleChangePassword}
          >
            Aggiorna password
          </Button>
          <p className="text-sm text-gray-500">
            I tuoi dati sono protetti e conformi alle normative sulla privacy.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" loading={saving}>
        <Save className="w-4 h-4" />
        Salva Impostazioni
      </Button>
    </div>
  )
}
