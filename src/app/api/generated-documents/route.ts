import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set(['referral', 'letter', 'certificate'])
const MAX_PATIENT_NAME = 200
const MAX_BODY = 50_000

type Row = {
  id: string
  doctor_id: string
  type: 'referral' | 'letter' | 'certificate'
  patient_name: string
  body: string
  created_at: string
}

export type GeneratedDocumentApi = {
  id: string
  type: 'referral' | 'letter' | 'certificate'
  patientName: string
  body: string
  createdAt: string
}

function toApi(r: Row): GeneratedDocumentApi {
  return {
    id: r.id,
    type: r.type,
    patientName: r.patient_name,
    body: r.body,
    createdAt: r.created_at,
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
    const typeFilter = url.searchParams.get('type')

    let q = supabase
      .from('generated_documents')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (typeFilter && ALLOWED_TYPES.has(typeFilter)) {
      q = q.eq('type', typeFilter)
    }

    const { data, error } = await q
    if (error) {
      console.error('generated_documents list:', error)
      return NextResponse.json(
        {
          error:
            'Impossibile caricare i documenti. Esegui la migration 008_generated_documents.sql su Supabase.',
        },
        { status: 500 }
      )
    }

    const documents = (data as Row[]).map(toApi)
    return NextResponse.json({ documents })
  } catch (e) {
    console.error('GET /api/generated-documents:', e)
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
    const rl = await rateLimit(`gen-docs-post:${user.id}:${ip}`, 30, 60_000)
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

    const type = typeof b.type === 'string' ? b.type : ''
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Tipo documento non valido.' }, { status: 400 })
    }
    const patientName = typeof b.patientName === 'string'
      ? b.patientName.trim().slice(0, MAX_PATIENT_NAME)
      : ''
    const docBody = typeof b.body === 'string' ? b.body.slice(0, MAX_BODY) : ''

    if (!patientName) {
      return NextResponse.json({ error: 'Nome paziente richiesto.' }, { status: 400 })
    }
    if (!docBody.trim()) {
      return NextResponse.json({ error: 'Contenuto documento richiesto.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('generated_documents')
      .insert({
        doctor_id: user.id,
        type,
        patient_name: patientName,
        body: docBody,
      })
      .select()
      .single()

    if (error) {
      console.error('generated_documents insert:', error)
      return NextResponse.json(
        { error: 'Impossibile salvare il documento.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document: toApi(data as Row) })
  } catch (e) {
    console.error('POST /api/generated-documents:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
