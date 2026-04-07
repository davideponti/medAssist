import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = context.params
    if (!id) {
      return NextResponse.json({ error: 'Mancante id' }, { status: 400 })
    }

    const body = await request.json()
    const doctor_reply = body.doctor_reply != null ? String(body.doctor_reply) : undefined
    const ai_suggested_reply =
      body.ai_suggested_reply != null ? String(body.ai_suggested_reply) : undefined
    const suggested_action =
      body.suggested_action != null ? String(body.suggested_action) : undefined
    const markRead = Boolean(body.markRead)

    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 })
    }

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
