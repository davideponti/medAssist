import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { validatePasswordStrength } from '@/lib/password-policy'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { currentPassword, newPassword } = body

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
