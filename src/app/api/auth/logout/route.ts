import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth-cookie'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
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
