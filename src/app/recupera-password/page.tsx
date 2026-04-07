'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Stethoscope, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function RecuperaPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && data.error) {
        setMessage({ type: 'err', text: data.error })
        return
      }
      setMessage({
        type: 'ok',
        text:
          data.message ||
          'Se l’indirizzo corrisponde a un account, riceverai un’email con le istruzioni.',
      })
      setEmail('')
    } catch {
      setMessage({ type: 'err', text: 'Richiesta non riuscita. Riprova.' })
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
          <CardTitle className="text-2xl">Recupera password</CardTitle>
          <p className="text-gray-500 text-sm">
            Riceverai un&apos;email con un link per scegliere una nuova password (controlla anche lo spam).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {message && (
              <div
                className={
                  message.type === 'ok'
                    ? 'bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm'
                    : 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'
                }
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia link via email'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-medical-600 hover:text-medical-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna al login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
