import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const MAX_FEEDBACK = 5_000

/** Salva feedback di cancellazione abbonamento */
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 })
    }

    const ip = getClientIp(request)
    const rl = await rateLimit(`feedback:${user.id}:${ip}`, 10, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }
    const feedbackRaw = (body as Record<string, unknown>).feedback

    if (!feedbackRaw || typeof feedbackRaw !== 'string' || feedbackRaw.trim().length === 0) {
      return NextResponse.json({ error: 'Feedback mancante' }, { status: 400 })
    }
    const feedback = feedbackRaw.trim().slice(0, MAX_FEEDBACK)

    console.log('Feedback cancellazione:', { userId: user.id, feedback })

    // TODO: Creare tabella cancellations_feedback e salvare qui

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Feedback error:', e)
    return NextResponse.json(
      { error: 'Errore durante il salvataggio' },
      { status: 500 }
    )
  }
}
