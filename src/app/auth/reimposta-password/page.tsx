'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Stethoscope, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PASSWORD_HINT_IT, validatePasswordStrength } from '@/lib/password-policy'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ReimpostaPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash
      if (h.includes('type=recovery') || h.includes('access_token')) {
        setReady(true)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) {
      setError('Le password non coincidono.')
      return
    }
    const v = validatePasswordStrength(password)
    if (!v.ok) {
      setError(v.error)
      return
    }
    setLoading(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password })
      if (upErr) {
        setError(upErr.message)
        return
      }
      await supabase.auth.signOut()
      router.push('/login?reimpostata=1')
    } catch {
      setError('Aggiornamento non riuscito. Richiedi un nuovo link dall’email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-50 to-primary-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-medical-500 rounded-full flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Nuova password</CardTitle>
          <p className="text-gray-500 text-sm">Scegli una password sicura per il tuo account.</p>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-600 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-medical-600" />
              <p>Verifica del link in corso…</p>
              <p className="text-xs text-center text-gray-500">
                Se resti bloccato, apri il link direttamente dall’ultima email ricevuta da Supabase.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-gray-600">{PASSWORD_HINT_IT}</p>
              <Input
                label="Nuova password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Conferma password"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva password'}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-medical-600 hover:underline font-medium">
              Torna al login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
