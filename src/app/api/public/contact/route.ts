import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getClientIp, isAllowedOrigin, rateLimit, verifyTurnstileToken } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_RE = /^[+]?[\d\s().-]{6,20}$/

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const ip = getClientIp(request)
    const rl = await rateLimit(`public-contact:${ip}`, 8, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const doctorId = String(body.doctorId ?? '').trim()
    const patientName = String(body.patientName ?? '').trim()
    const patientEmail = body.patientEmail != null ? String(body.patientEmail).trim() : ''
    const patientPhone = body.patientPhone != null ? String(body.patientPhone).trim() : ''
    const turnstileToken = body.turnstileToken != null ? String(body.turnstileToken).trim() : ''
    const message = String(body.message ?? '').trim()

    if (!UUID_RE.test(doctorId)) {
      return NextResponse.json({ error: 'Identificativo studio non valido.' }, { status: 400 })
    }
    if (!patientName || patientName.length > 200) {
      return NextResponse.json({ error: 'Indica un nome valido.' }, { status: 400 })
    }
    if (!patientEmail && !patientPhone) {
      return NextResponse.json(
        { error: 'Inserisci almeno un contatto: email o numero di telefono.' },
        { status: 400 }
      )
    }
    if (patientEmail && (!EMAIL_RE.test(patientEmail) || patientEmail.length > 254)) {
      return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 400 })
    }
    if (patientPhone && !PHONE_RE.test(patientPhone)) {
      return NextResponse.json({ error: 'Numero di telefono non valido.' }, { status: 400 })
    }
    if (message.length < 3 || message.length > 8000) {
      return NextResponse.json(
        { error: 'Il messaggio deve contenere tra 3 e 8000 caratteri.' },
        { status: 400 }
      )
    }
    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Verifica anti-spam non valida. Riprova.' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    const { data: doctor, error: dErr } = await admin
      .from('doctors')
      .select('id')
      .eq('id', doctorId)
      .maybeSingle()

    if (dErr || !doctor) {
      return NextResponse.json({ error: 'Studio non trovato.' }, { status: 404 })
    }

    const { error: insErr } = await admin.from('patient_messages').insert({
      doctor_id: doctorId,
      patient_name: patientName,
      patient_email: patientEmail || null,
      patient_phone: patientPhone || null,
      body: message,
    })

    if (insErr) {
      console.error('patient_messages insert:', insErr)
      return NextResponse.json(
        { error: 'Impossibile inviare il messaggio. Riprova più tardi.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('public contact:', e)
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }
}
