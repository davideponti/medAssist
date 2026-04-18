import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const MAX_TITLE = 300
const MAX_CONTEXT = 10_000
const MAX_TRANSCRIPTION = 50_000
const MAX_SOAP_FIELD = 20_000
const MAX_SUMMARY = 5_000

function safeStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, max)
}

type VisitRow = {
  id: string
  doctor_id: string
  title: string
  archived: boolean
  patient_context: string | null
  transcription: string
  soap_subjective: string | null
  soap_objective: string | null
  soap_assessment: string | null
  soap_plan: string | null
  soap_summary: string | null
  created_at: string
  updated_at: string
}

export type VisitApi = {
  id: string
  title: string
  archived: boolean
  patientContext: string
  transcription: string
  clinicalNote: {
    subjective: string
    objective: string
    assessment: string
    plan: string
    summary: string
  }
  createdAt: string
}

function toApi(row: VisitRow): VisitApi {
  return {
    id: row.id,
    title: row.title,
    archived: row.archived,
    patientContext: row.patient_context ?? '',
    transcription: row.transcription,
    clinicalNote: {
      subjective: row.soap_subjective ?? '',
      objective: row.soap_objective ?? '',
      assessment: row.soap_assessment ?? '',
      plan: row.soap_plan ?? '',
      summary: row.soap_summary ?? '',
    },
    createdAt: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const url = new URL(request.url)
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1),
      500
    )
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)
    const includeArchived = url.searchParams.get('includeArchived') === '1'

    let q = supabase
      .from('visits')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!includeArchived) {
      q = q.eq('archived', false)
    }

    const { data, error } = await q
    if (error) {
      console.error('visits list:', error)
      return NextResponse.json(
        {
          error:
            'Impossibile caricare le visite. Esegui la migration 007_visits.sql su Supabase.',
        },
        { status: 500 }
      )
    }

    const visits = (data as VisitRow[]).map(toApi)
    return NextResponse.json({ visits })
  } catch (e) {
    console.error('GET /api/visits:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}

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
    const rl = await rateLimit(`visits-post:${user.id}:${ip}`, 30, 60_000)
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

    const title = safeStr(b.title, MAX_TITLE).trim() || 'Visita'
    const transcription = safeStr(b.transcription, MAX_TRANSCRIPTION)
    if (!transcription.trim()) {
      return NextResponse.json({ error: 'Trascrizione richiesta.' }, { status: 400 })
    }
    const patientContext = safeStr(b.patientContext, MAX_CONTEXT)
    const archived = Boolean(b.archived)

    const note = (b.clinicalNote && typeof b.clinicalNote === 'object' ? b.clinicalNote : {}) as Record<string, unknown>

    const { data, error } = await supabase
      .from('visits')
      .insert({
        doctor_id: user.id,
        title,
        archived,
        patient_context: patientContext || null,
        transcription,
        soap_subjective: safeStr(note.subjective, MAX_SOAP_FIELD) || null,
        soap_objective: safeStr(note.objective, MAX_SOAP_FIELD) || null,
        soap_assessment: safeStr(note.assessment, MAX_SOAP_FIELD) || null,
        soap_plan: safeStr(note.plan, MAX_SOAP_FIELD) || null,
        soap_summary: safeStr(note.summary, MAX_SUMMARY) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('visits insert:', error)
      return NextResponse.json(
        { error: 'Impossibile salvare la visita.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ visit: toApi(data as VisitRow) })
  } catch (e) {
    console.error('POST /api/visits:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
