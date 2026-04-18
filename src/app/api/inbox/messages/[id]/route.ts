import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_REPLY = 10_000
const MAX_ACTION = 500

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Id non valido' }, { status: 400 })
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
    const rl = await rateLimit(`inbox-patch:${user.id}:${ip}`, 60, 60_000)
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
    const b = body as Record<string, unknown>
    const doctor_reply =
      b.doctor_reply != null ? String(b.doctor_reply).slice(0, MAX_REPLY) : undefined
    const ai_suggested_reply =
      b.ai_suggested_reply != null ? String(b.ai_suggested_reply).slice(0, MAX_REPLY) : undefined
    const suggested_action =
      b.suggested_action != null ? String(b.suggested_action).slice(0, MAX_ACTION) : undefined
    const markRead = Boolean(b.markRead)

    const updates: Record<string, unknown> = {}
    if (doctor_reply !== undefined) updates.doctor_reply = doctor_reply || null
    if (ai_suggested_reply !== undefined) updates.ai_suggested_reply = ai_suggested_reply || null
    if (suggested_action !== undefined) updates.suggested_action = suggested_action || null
    if (markRead) updates.read_at = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('patient_messages')
      .update(updates)
      .eq('id', id)
      .eq('doctor_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('patient_messages patch:', error)
      return NextResponse.json({ error: 'Aggiornamento non riuscito' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 })
    }

    return NextResponse.json({ message: data })
  } catch (e) {
    console.error('inbox PATCH:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
