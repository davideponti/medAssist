import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const doctorId = String(body.doctorId ?? '').trim()
    const patientName = String(body.patientName ?? '').trim()
    const patientEmail = body.patientEmail != null ? String(body.patientEmail).trim() : ''
    const message = String(body.message ?? '').trim()

    if (!UUID_RE.test(doctorId)) {
      return NextResponse.json({ error: 'Identificativo studio non valido.' }, { status: 400 })
    }
    if (!patientName || patientName.length > 200) {
      return NextResponse.json({ error: 'Indica un nome valido.' }, { status: 400 })
    }
    if (message.length < 3 || message.length > 8000) {
      return NextResponse.json(
        { error: 'Il messaggio deve contenere tra 3 e 8000 caratteri.' },
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
