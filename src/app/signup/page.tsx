'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Stethoscope, Loader2, User, Building2 } from 'lucide-react'
import { PASSWORD_HINT_IT, validatePasswordStrength } from '@/lib/password-policy'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [clinic, setClinic] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [planBanner, setPlanBanner] = useState<string | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const piano = q.get('piano')
    const trial = q.get('trial')
    const stripeOk = q.get('stripe') === 'success'
    if (piano === 'gratis') {
      setPlanBanner(
        'Piano selezionato: Gratis — fino a 20 visite registrate e 20 generazioni di documenti.'
      )
    } else if (piano === 'professionale') {
      if (trial === '7') {
        let msg =
          'Piano selezionato: Professionale — prova gratuita di 7 giorni; al termine, salvo disdetta, applicazione del canone mensile di € 49 come da condizioni accettate al checkout.'
        if (stripeOk) {
          msg +=
            " Pagamento Stripe completato: completa la registrazione per attivare l'account."
        }
        setPlanBanner(msg)
      } else {
        setPlanBanner('Piano selezionato: Professionale.')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Le password non coincidono')
      return
    }

    const pwdCheck = validatePasswordStrength(password)
    if (!pwdCheck.ok) {
      setError(pwdCheck.error)
      return
    }

    setLoading(true)
    try {
      await signup({
        email: email.trim(),
        password,
        name: name.trim(),
        specialization: specialization.trim(),
        clinic: clinic.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-50 to-primary-50 p-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-medical-500 rounded-full flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Crea il tuo account</CardTitle>
          <p className="text-gray-500">Registrati e completa il profilo medico</p>
          {planBanner && (
            <div className="mt-4 text-left bg-primary-50 border border-primary-100 text-primary-900 text-sm px-4 py-3 rounded-lg">
              {planBanner}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-medical-600" />
                Accesso
              </div>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="nome@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 -mb-1">{PASSWORD_HINT_IT}</p>
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 caratteri, numero e simbolo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <Input
                label="Conferma password"
                type="password"
                autoComplete="new-password"
                placeholder="Ripeti la password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Stethoscope className="w-4 h-4 text-medical-600" />
                Dati medico
              </div>
              <Input
                label="Nome e titolo"
                placeholder="es. Dott. Mario Rossi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Specializzazione"
                placeholder="es. Medicina generale, Cardiologia..."
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4 text-medical-600" />
                Studio (opzionale)
              </div>
              <Input
                label="Nome studio"
                placeholder="Studio Medico..."
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
              />
              <Input
                label="Indirizzo"
                placeholder="Via, CAP, città"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Input
                label="Telefono"
                type="tel"
                placeholder="+39 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrati'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Hai già un account?{' '}
            <Link href="/login" className="text-medical-600 hover:text-medical-700 font-medium">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
