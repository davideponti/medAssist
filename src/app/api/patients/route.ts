import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'
import type { Patient } from '@/lib/patient-types'

export const dynamic = 'force-dynamic'

const MAX_NAME = 200
const MAX_PHONE = 50
const MAX_EMAIL = 254
const MAX_DIAGNOSIS = 5_000
const MAX_MEDICATIONS = 5_000
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_RE = /^[+]?[\d\s().-]{6,50}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type PatientRow = {
  id: string
  doctor_id: string
  name: string
  age: number | null
  phone: string | null
  email: string | null
  last_visit: string | null
  diagnosis: string | null
  medications: string | null
  created_at: string
}

function toApi(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    email: row.email,
    lastVisit: row.last_visit,
    diagnosis: row.diagnosis,
    medications: row.medications,
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

    // Paginazione: ?limit=50&offset=0 (max 200)
    const url = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('patients list:', error)
      return NextResponse.json(
        {
          error:
            'Impossibile caricare i pazienti. Esegui la migration 005_patients.sql su Supabase.',
        },
        { status: 500 }
      )
    }

    const patients = (data as PatientRow[]).map(toApi)
    return NextResponse.json({ patients })
  } catch (e) {
    console.error('GET /api/patients:', e)
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
    const rl = await rateLimit(`patients-post:${user.id}:${ip}`, 30, 60_000)
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

    const name = String(b.name ?? '').trim().slice(0, MAX_NAME)
    if (!name) {
      return NextResponse.json({ error: 'Il nome è richiesto' }, { status: 400 })
    }

    const ageRaw = b.age
    let age: number | null = null
    if (ageRaw !== undefined && ageRaw !== null && ageRaw !== '') {
      const n = typeof ageRaw === 'number' ? ageRaw : parseInt(String(ageRaw), 10)
      age = Number.isFinite(n) ? Math.max(0, Math.min(130, Math.floor(n))) : null
    }

    const phoneRaw = b.phone != null ? String(b.phone).trim().slice(0, MAX_PHONE) : ''
    if (phoneRaw && !PHONE_RE.test(phoneRaw)) {
      return NextResponse.json({ error: 'Numero di telefono non valido.' }, { status: 400 })
    }
    const phone = phoneRaw || null

    const emailRaw = b.email != null ? String(b.email).trim().toLowerCase().slice(0, MAX_EMAIL) : ''
    if (emailRaw && !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 400 })
    }
    const email = emailRaw || null

    const lastVisitRaw = b.lastVisit != null ? String(b.lastVisit).slice(0, 10) : ''
    if (lastVisitRaw && !DATE_RE.test(lastVisitRaw)) {
      return NextResponse.json({ error: 'Data ultima visita non valida.' }, { status: 400 })
    }
    const lastVisit = lastVisitRaw || null

    const diagnosis = b.diagnosis != null
      ? String(b.diagnosis).trim().slice(0, MAX_DIAGNOSIS) || null
      : null
    const medications = b.medications != null
      ? String(b.medications).trim().slice(0, MAX_MEDICATIONS) || null
      : null

    const { data, error } = await supabase
      .from('patients')
      .insert({
        doctor_id: user.id,
        name,
        age,
        phone,
        email,
        last_visit: lastVisit,
        diagnosis,
        medications,
      })
      .select()
      .single()

    if (error) {
      console.error('patients insert:', error)
      return NextResponse.json(
        { error: 'Impossibile salvare il paziente. Verifica la tabella patients su Supabase.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patient: toApi(data as PatientRow) })
  } catch (e) {
    console.error('POST /api/patients:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
