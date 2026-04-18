import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth-cookie'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Invalida il JWT lato Supabase in modo che non sia riutilizzabile
    const token = getSessionTokenFromRequest(request)
    if (token) {
      try {
        const supabase = createUserSupabase(token)
        await supabase.auth.signOut()
      } catch (e) {
        // Non bloccare il logout se Supabase fallisce
        console.warn('Supabase signOut failed (cookie cleared anyway):', e)
      }
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      ...sessionCookieOptions(0),
      maxAge: 0,
    })
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
