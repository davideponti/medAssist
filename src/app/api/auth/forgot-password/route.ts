import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }

    const ip = getClientIp(request)
    // 3 richieste / 15 min per IP: difesa da spam email
    const rl = await rateLimit(`forgot-password:${ip}`, 3, 15 * 60_000)
    if (!rl.ok) {
      // Rispondiamo comunque 200 per non leakare il blocco
      return NextResponse.json({
        ok: true,
        message:
          'Se l\u2019indirizzo corrisponde a un account, riceverai a breve un\u2019email con il link per reimpostare la password.',
      })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }
    const email = String((body as Record<string, unknown>).email ?? '').trim().toLowerCase().slice(0, 254)

    if (!email || !EMAIL_RE.test(email)) {
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
