import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { validatePasswordStrength } from '@/lib/password-policy'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const MAX_EMAIL = 254
const MAX_NAME = 200
const MAX_SPEC = 200
const MAX_CLINIC = 300
const MAX_ADDRESS = 500
const MAX_PHONE = 50

function safeStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const ip = getClientIp(request)
    const rl = await rateLimit(`auth-signup:${ip}`, 6, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste di registrazione. Riprova tra poco.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': String(rl.retryAfterSec),
            'X-RateLimit-Limit': String(rl.total),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': String(Date.now() + rl.retryAfterSec * 1000)
          } 
        }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Signup: SUPABASE_SERVICE_ROLE_KEY mancante in .env.local')
      return NextResponse.json(
        {
          error:
            'Configurazione server incompleta: manca SUPABASE_SERVICE_ROLE_KEY (vedi documentazione Supabase).',
        },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
    }

    const email = safeStr((body as Record<string, unknown>).email, MAX_EMAIL).toLowerCase()
    const passwordRaw = (body as Record<string, unknown>).password
    const password = typeof passwordRaw === 'string' ? passwordRaw : ''
    const name = safeStr((body as Record<string, unknown>).name, MAX_NAME)
    const specialization = safeStr((body as Record<string, unknown>).specialization, MAX_SPEC)
    const clinic = safeStr((body as Record<string, unknown>).clinic, MAX_CLINIC)
    const address = safeStr((body as Record<string, unknown>).address, MAX_ADDRESS)
    const phone = safeStr((body as Record<string, unknown>).phone, MAX_PHONE)

    if (!email || !password || !name || !specialization) {
      return NextResponse.json(
        { error: 'Email, password, nome e specializzazione sono obbligatori.' },
        { status: 400 }
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 400 })
    }

    const pwdCheck = validatePasswordStrength(password)
    if (!pwdCheck.ok) {
      return NextResponse.json({ error: pwdCheck.error }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        specialization,
        clinic: clinic || undefined,
        address: address || undefined,
        phone: phone || undefined,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Messaggi generici per evitare user enumeration
      const msg = authError.message.toLowerCase().includes('already')
        ? 'Account già esistente con questa email.'
        : 'Registrazione non riuscita. Verifica i dati inseriti.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('doctors').insert([
      {
        id: authData.user.id,
        email,
        name,
        specialization,
        clinic: clinic || null,
        address: address || null,
        phone: phone || null,
      },
    ])

    if (profileError) {
      console.error('Profile error:', profileError)
      // Tentativo di rollback: cancella l'utente auth per evitare account orfani.
      // Retry fino a 3 volte con backoff; se fallisce, logga esplicitamente.
      let deleted = false
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { error: delErr } = await supabase.auth.admin.deleteUser(authData.user.id)
          if (!delErr) {
            deleted = true
            break
          }
        } catch (e) {
          console.warn(`deleteUser attempt ${attempt + 1} failed:`, e)
        }
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
      }
      if (!deleted) {
        console.error(
          `[SECURITY] ORPHAN USER: id=${authData.user.id} email=${email}: rimosso profilo fallito ma auth user persiste. Richiede cleanup manuale.`
        )
      }
      return NextResponse.json(
        { error: 'Impossibile creare il profilo medico. Contatta il supporto.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
