import { NextRequest, NextResponse } from 'next/server'
import { generateClinicalNote } from '@/lib/openai'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

type DoctorCorrections = {
  diagnosis?: string
  therapy?: string
  followup?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const token = getSessionTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 })
    const ip = getClientIp(request)
    const rl = await rateLimit(`soap-generate:${user.id}:${ip}`, 30, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste SOAP. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = (await request.json()) as {
      transcription?: string
      patientContext?: string
      corrections?: DoctorCorrections
      patientNames?: string[]
    }

    const transcription = body.transcription?.trim()
    if (!transcription) {
      return NextResponse.json({ error: 'Trascrizione richiesta' }, { status: 400 })
    }

    const MAX_TRANSCRIPTION = 50_000
    const MAX_FIELD = 5_000
    if (transcription.length > MAX_TRANSCRIPTION) {
      return NextResponse.json({ error: 'Trascrizione troppo lunga.' }, { status: 413 })
    }

    const patientContextBase = (body.patientContext?.trim() || '').slice(0, MAX_FIELD)
    const corrections: DoctorCorrections = body.corrections || {}
    corrections.diagnosis = corrections.diagnosis?.slice(0, MAX_FIELD)
    corrections.therapy = corrections.therapy?.slice(0, MAX_FIELD)
    corrections.followup = corrections.followup?.slice(0, MAX_FIELD)

    const correctionsBlock = [
      corrections.diagnosis?.trim()
        ? `Diagnosi/Valutazione (da confermare):\n${corrections.diagnosis.trim()}`
        : null,
      corrections.therapy?.trim()
        ? `Terapia/Prescrizioni (da confermare):\n${corrections.therapy.trim()}`
        : null,
      corrections.followup?.trim()
        ? `Follow-up/Piano (da confermare):\n${corrections.followup.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    const patientContext =
      correctionsBlock.length > 0
        ? [patientContextBase, `Correzioni del medico (da incorporare):\n${correctionsBlock}`]
            .filter(Boolean)
            .join('\n\n')
        : patientContextBase || undefined

    const clinicalNote = await generateClinicalNote(
      transcription,
      patientContext,
      body.patientNames
    )

    return NextResponse.json({ clinicalNote })
  } catch (e) {
    console.error('SOAP generate:', e)
    return NextResponse.json(
      { error: 'Impossibile generare la SOAP. Riprova tra poco.' },
      { status: 500 }
    )
  }
}

