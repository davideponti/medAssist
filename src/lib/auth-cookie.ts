/** Nome cookie sessione (httpOnly); usato da API, middleware e login/logout. */
export const SESSION_COOKIE_NAME = 'medassist_session'

export function sessionCookieOptions(maxAgeSeconds: number) {
  // Limit session to maximum 2 hours for security
  const secureMaxAge = Math.min(maxAgeSeconds, 2 * 60 * 60)
  
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: secureMaxAge,
  }
}
