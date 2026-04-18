import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const MAX_NAME = 200
const MAX_ADDRESS = 500
const MAX_PHONE = 50
const MAX_SPEC = 200
const MAX_CLINIC = 300
const MAX_ALBO = 50
const MAX_CF = 16

function safeStr(v: unknown, max: number): string | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'string') return undefined
  return v.trim().slice(0, max)
}

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json(doctor)
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const ip = getClientIp(request)
    const rl = await rateLimit(`doctor-profile:${user.id}:${ip}`, 15, 60_000)
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

    // NOTA SICUREZZA: il campo `email` viene IGNORATO qui.
    // La modifica email deve passare dal flusso Supabase Auth (verifica mail)
    // per prevenire impersonificazione via aggiornamento diretto del profilo.
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const nameV = safeStr(body.name, MAX_NAME)
    if (nameV !== undefined) updates.name = nameV || undefined
    const phoneV = safeStr(body.phone, MAX_PHONE)
    if (phoneV !== undefined) updates.phone = phoneV || null
    const specV = safeStr(body.specialization, MAX_SPEC)
    if (specV !== undefined) updates.specialization = specV || undefined
    const clinicV = safeStr(body.clinic, MAX_CLINIC)
    if (clinicV !== undefined) updates.clinic = clinicV || null
    const addrV = safeStr(body.address, MAX_ADDRESS)
    if (addrV !== undefined) updates.address = addrV || null
    const alboV = safeStr(body.albo_registration, MAX_ALBO)
    if (alboV !== undefined) updates.albo_registration = alboV || null
    const cfV = safeStr(body.fiscal_code, MAX_CF)
    if (cfV !== undefined) updates.fiscal_code = cfV || null

    const { data: doctor, error: updateError } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update profile error:', updateError)
      return NextResponse.json(
        { error: 'Aggiornamento non riuscito' },
        { status: 500 }
      )
    }

    return NextResponse.json(doctor)
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
