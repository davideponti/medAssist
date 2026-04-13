import { NextRequest, NextResponse } from 'next/server'
import { generateDocument, type DoctorLetterhead } from '@/lib/openai'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'

export const dynamic = 'force-dynamic'

async function getDoctorFromAuth(request: NextRequest): Promise<DoctorLetterhead | null> {
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
    name: row.name ?? '',
    email: row.email,
    phone: row.phone,
    clinic: row.clinic,
    address: row.address,
    specialization: row.specialization,
    albo_registration: row.albo_registration,
    fiscal_code: row.fiscal_code,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, context } = body

    if (!type || !context) {
      return NextResponse.json(
        { error: 'Document type and context required' },
        { status: 400 }
      )
    }

    const doctor = await getDoctorFromAuth(request)
    const document = await generateDocument(type, context, doctor)

    const cleanedDocument = document
      .replace(/^```[\w]*\n?/, '')
      .replace(/```$/, '')
      .trim();

    return NextResponse.json({ document: cleanedDocument })
  } catch (error) {
    console.error('Document generation error:', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Generazione documento non riuscita', details },
      { status: 500 }
    )
  }
}
