import { NextRequest, NextResponse } from 'next/server'
import { generateDocument, type DoctorLetterhead } from '@/lib/openai'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const MAX_FIELD_LEN = 10_000
const ALLOWED_TYPES = new Set(['referral', 'letter', 'certificate'])

function sanitizeField(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, MAX_FIELD_LEN)
}

async function getDoctorFromAuth(request: NextRequest): Promise<{
  userId: string
  letterhead: DoctorLetterhead
} | null> {
  const token = getSessionTokenFromRequest(request)
  if (!token) return null

  const supabase = createUserSupabase(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: row } = await supabase
    .from('doctors')
    .select('name, email, phone, clinic, address, specialization, albo_registration, fiscal_code')
    .eq('id', user.id)
    .single()

  if (!row) return null

  return {
    userId: user.id,
    letterhead: {
      name: row.name ?? '',
      email: row.email,
      phone: row.phone,
      clinic: row.clinic,
      address: row.address,
      specialization: row.specialization,
      albo_registration: row.albo_registration,
      fiscal_code: row.fiscal_code,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Origin check ─────────────────────────────
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }

    // ── Auth obbligatoria ────────────────────────
    const auth = await getDoctorFromAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // ── Rate limit per utente + IP ──────────────
    const ip = getClientIp(request)
    const rl = await rateLimit(`documents:${auth.userId}:${ip}`, 20, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    // ── Input validation ────────────────────────
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }

    const { type, context } = body as { type?: unknown; context?: unknown }

    if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Tipo documento non valido.' }, { status: 400 })
    }
    if (!context || typeof context !== 'object') {
      return NextResponse.json({ error: 'Contesto richiesto.' }, { status: 400 })
    }

    const ctx = context as Record<string, unknown>
    const safeContext = {
      patientName: sanitizeField(ctx.patientName),
      patientInfo: sanitizeField(ctx.patientInfo),
      clinicalNote: sanitizeField(ctx.clinicalNote),
      destination: sanitizeField(ctx.destination),
      additionalInfo: sanitizeField(ctx.additionalInfo),
    }

    if (!safeContext.patientName) {
      return NextResponse.json({ error: 'Nome paziente richiesto.' }, { status: 400 })
    }

    const document = await generateDocument(
      type as 'referral' | 'letter' | 'certificate',
      safeContext,
      auth.letterhead
    )

    const cleanedDocument = document
      .replace(/^```[\w]*\n?/, '')
      .replace(/```$/, '')
      .trim()

    return NextResponse.json({ document: cleanedDocument })
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: 'Generazione documento non riuscita' },
      { status: 500 }
    )
  }
}
