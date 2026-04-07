import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import type { Patient } from '@/lib/patient-types'

export const dynamic = 'force-dynamic'

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

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

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

    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
    }

    const ageRaw = body.age
    let age: number | null = null
    if (ageRaw !== undefined && ageRaw !== null && ageRaw !== '') {
      const n = typeof ageRaw === 'number' ? ageRaw : parseInt(String(ageRaw), 10)
      age = Number.isFinite(n) ? Math.max(0, Math.min(130, Math.floor(n))) : null
    }

    const phone = body.phone != null ? String(body.phone).trim() || null : null
    const email = body.email != null ? String(body.email).trim().toLowerCase() || null : null
    const lastVisit = body.lastVisit != null && String(body.lastVisit).trim() !== ''
      ? String(body.lastVisit).slice(0, 10)
      : null
    const diagnosis = body.diagnosis != null ? String(body.diagnosis).trim() || null : null
    const medications = body.medications != null ? String(body.medications).trim() || null : null

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
