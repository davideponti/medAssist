import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { validatePasswordStrength } from '@/lib/password-policy'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }

    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 })
    }

    // Rate limit stretto: max 5 tentativi in 5 minuti per utente + IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`change-password:${user.id}:${ip}`, 5, 5 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    // Limite ragionevole anche sulla lunghezza per prevenire abuse
    if (currentPassword.length > 200 || newPassword.length > 200) {
      return NextResponse.json({ error: 'Password troppo lunga.' }, { status: 400 })
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Inserisci password attuale e nuova password' },
        { status: 400 }
      )
    }

    const pwdCheck = validatePasswordStrength(newPassword)
    if (!pwdCheck.ok) {
      return NextResponse.json({ error: pwdCheck.error }, { status: 400 })
    }

    const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Password attuale non corretta' },
        { status: 401 }
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Impossibile aggiornare la password' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Errore durante il cambio password' },
      { status: 500 }
    )
  }
}
