import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_TITLE = 300
const MAX_CONTEXT = 10_000
const MAX_TRANSCRIPTION = 50_000
const MAX_SOAP_FIELD = 20_000
const MAX_SUMMARY = 5_000

function safeStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, max)
}

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
    const rl = await rateLimit(`visits-patch:${user.id}:${ip}`, 60, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (b.title !== undefined) {
      const t = safeStr(b.title, MAX_TITLE).trim()
      if (t) updates.title = t
    }
    if (b.archived !== undefined) updates.archived = Boolean(b.archived)
    if (b.patientContext !== undefined) {
      updates.patient_context = safeStr(b.patientContext, MAX_CONTEXT) || null
    }
    if (b.transcription !== undefined) {
      const tr = safeStr(b.transcription, MAX_TRANSCRIPTION)
      if (tr.trim()) updates.transcription = tr
    }
    if (b.clinicalNote && typeof b.clinicalNote === 'object') {
      const note = b.clinicalNote as Record<string, unknown>
      if (note.subjective !== undefined)
        updates.soap_subjective = safeStr(note.subjective, MAX_SOAP_FIELD) || null
      if (note.objective !== undefined)
        updates.soap_objective = safeStr(note.objective, MAX_SOAP_FIELD) || null
      if (note.assessment !== undefined)
        updates.soap_assessment = safeStr(note.assessment, MAX_SOAP_FIELD) || null
      if (note.plan !== undefined)
        updates.soap_plan = safeStr(note.plan, MAX_SOAP_FIELD) || null
      if (note.summary !== undefined)
        updates.soap_summary = safeStr(note.summary, MAX_SUMMARY) || null
    }

    if (Object.keys(updates).length === 1) {
      // Solo updated_at: nessun campo utile
      return NextResponse.json({ error: 'Nessun campo da aggiornare.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .eq('doctor_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('visits patch:', error)
      return NextResponse.json({ error: 'Aggiornamento non riuscito.' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Visita non trovata.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/visits/[id]:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}

export async function DELETE(
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
    const rl = await rateLimit(`visits-delete:${user.id}:${ip}`, 30, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', id)
      .eq('doctor_id', user.id)

    if (error) {
      console.error('visits delete:', error)
      return NextResponse.json({ error: 'Cancellazione non riuscita.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/visits/[id]:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
