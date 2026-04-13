import { NextRequest, NextResponse } from 'next/server'
import { generatePatientResponse } from '@/lib/openai'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { isAllowedOrigin } from '@/lib/api-security'

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

    const body = await request.json()
    const { message, patientContext, previousContext } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message required' },
        { status: 400 }
      )
    }

    const result = await generatePatientResponse(
      message,
      patientContext,
      previousContext
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Inbox response error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
