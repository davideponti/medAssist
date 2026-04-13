import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import type { PatientMessageRow } from '@/lib/inbox-types'

export const dynamic = 'force-dynamic'

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

    const { data, error } = await supabase
      .from('patient_messages')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('patient_messages list:', error)
      return NextResponse.json(
        { error: 'Impossibile caricare i messaggi. Esegui la migration 004_patient_messages su Supabase.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { messages: data as PatientMessageRow[] },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (e) {
    console.error('inbox messages GET:', e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
