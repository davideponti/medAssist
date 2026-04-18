import type { NextRequest } from 'next/server'
import { rateLimit as redisRateLimit } from './redis-rate-limit'

/**
 * Restituisce l'IP del client in modo affidabile.
 *
 * In produzione dietro proxy (Vercel, Cloudflare, Nginx), `x-forwarded-for`
 * contiene la catena di IP; il PRIMO è quello del client.
 *
 * In sviluppo locale, si ripiega su `x-real-ip` o una stringa deterministica.
 * Non utilizzare questo IP per decisioni di sicurezza assolute, solo come
 * componente di chiavi di rate limiting.
 */
export function getClientIp(request: NextRequest): string {
  // Vercel imposta x-real-ip con l'IP client effettivo
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  // Cloudflare (se usato in futuro)
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  // Fallback su x-forwarded-for
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0].trim()
    if (first) return first
  }

  return 'unknown'
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSec: number; remaining: number; total: number }> {
  return redisRateLimit(key, limit, windowMs)
}

export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const allowed = new Set<string>([
    request.nextUrl.origin,
    (process.env.NEXT_PUBLIC_APP_URL || '').trim(),
  ])
  return allowed.has(origin)
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    // Fail-closed in produzione: se la chiave manca, NON disabilitare silenziosamente
    // il captcha. In dev/test consentiamo il bypass per sviluppo locale.
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] TURNSTILE_SECRET_KEY mancante in produzione: captcha disabilitato!')
      return false
    }
    return true
  }
  if (!token) return false

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

