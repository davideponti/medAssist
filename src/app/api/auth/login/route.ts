import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth-cookie'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', data.user.id)
      .single()

    const accessToken = data.session?.access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Sessione non disponibile' },
        { status: 500 }
      )
    }

    const maxAge = data.session.expires_in ?? 3600
    const res = NextResponse.json({
      user: data.user,
      doctor,
    })
    res.cookies.set(
      SESSION_COOKIE_NAME,
      accessToken,
      sessionCookieOptions(maxAge)
    )
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
