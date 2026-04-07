import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-cookie'

/** JWT access token dalla sessione httpOnly (solo route server). */
export function getSessionTokenFromRequest(request: NextRequest): string | null {
  const v = request.cookies.get(SESSION_COOKIE_NAME)?.value
  return v && v.length > 0 ? v : null
}
