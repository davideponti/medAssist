import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Indica un indirizzo email valido.' }, { status: 400 })
    }

    const origin = request.nextUrl.origin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reimposta-password`,
    })

    if (error) {
      console.error('resetPasswordForEmail:', error.message)
    }

    // Risposta uniforme per non rivelare se l'email è registrata
    return NextResponse.json({
      ok: true,
      message:
        'Se l’indirizzo corrisponde a un account, riceverai a breve un’email con il link per reimpostare la password.',
    })
  } catch (e) {
    console.error('forgot-password:', e)
    return NextResponse.json(
      {
        ok: true,
        message:
          'Se l’indirizzo corrisponde a un account, riceverai a breve un’email con il link per reimpostare la password.',
      },
      { status: 200 }
    )
  }
}
