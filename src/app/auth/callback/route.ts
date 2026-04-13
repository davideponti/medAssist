import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth-cookie'
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger'
import { getClientIp } from '@/lib/api-security'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || undefined

    if (error) {
      logAuthFailure('google_oauth', ip, errorDescription || error, userAgent)
      const redirectUrl = `/login?error=${encodeURIComponent(errorDescription || error)}`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    if (!code) {
      logAuthFailure('google_oauth', ip, 'Missing authorization code', userAgent)
      return NextResponse.redirect(new URL('/login?error=Authorization failed', request.url))
    }

    // Exchange code for session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      logAuthFailure('google_oauth', ip, sessionError.message, userAgent)
      return NextResponse.redirect(new URL('/login?error=Authentication failed', request.url))
    }

    // Check if user exists in doctors table
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (doctorError || !doctor) {
      // User doesn't exist in doctors table, create profile
      const { error: insertError } = await supabase.from('doctors').insert([
        {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          specialization: 'Medico', // Default specialization
          clinic: null,
          address: null,
          phone: null,
        },
      ])

      if (insertError) {
        console.error('Error creating doctor profile:', insertError)
        logAuthFailure(data.user.email!, ip, 'Profile creation failed', userAgent)
        return NextResponse.redirect(new URL('/login?error=Profile creation failed', request.url))
      }
    }

    // Log successful authentication
    logAuthSuccess(data.user.id, data.user.email!, ip, userAgent)

    // Set session cookie
    const accessToken = data.session?.access_token
    if (!accessToken) {
      logAuthFailure(data.user.email!, ip, 'No access token', userAgent)
      return NextResponse.redirect(new URL('/login?error=Session creation failed', request.url))
    }

    const maxAge = data.session.expires_in ?? 3600
    const redirectUrl = next && next.startsWith('/') ? next : '/dashboard'
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.cookies.set(
      SESSION_COOKIE_NAME,
      accessToken,
      sessionCookieOptions(maxAge)
    )
    
    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    const ip = getClientIp(request)
    logAuthFailure('google_oauth', ip, 'Internal server error', request.headers.get('user-agent') || undefined)
    
    return NextResponse.redirect(new URL('/login?error=Internal server error', request.url))
  }
}
