import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe-server'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/sync-subscription
 *
 * Sincronizza lo stato dell'abbonamento Stripe nel database.
 * Utile quando il webhook non ha aggiornato correttamente il profilo.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }

    // ── Auth ──────────────────────────────────────────────
    const { getSessionTokenFromRequest } = await import('@/lib/auth-session')
    const { createUserSupabase } = await import('@/lib/supabase-user')

    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })
    }

    const supabase = createUserSupabase(token)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sessione non valida.' }, { status: 401 })
    }

    const ip = getClientIp(request)
    const rl = await rateLimit(`stripe-sync:${user.id}:${ip}`, 5, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    // ── Recupera profilo medico ───────────────────────────
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
    const admin = getSupabaseAdmin()

    const { data: doctor, error: dbError } = await admin
      .from('doctors')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (dbError || !doctor) {
      return NextResponse.json({ error: 'Profilo medico non trovato.' }, { status: 404 })
    }

    if (!doctor.stripe_customer_id) {
      return NextResponse.json({ error: 'Nessun account Stripe collegato.' }, { status: 400 })
    }

    // ── Cerca abbonamenti attivi su Stripe ─────────────────
    const stripe = getStripe()
    const subscriptions = await stripe.subscriptions.list({
      customer: doctor.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      // Prova anche con trialing
      const trialSubscriptions = await stripe.subscriptions.list({
        customer: doctor.stripe_customer_id,
        status: 'trialing',
        limit: 1,
      })

      if (trialSubscriptions.data.length === 0) {
        return NextResponse.json({
          message: 'Nessun abbonamento attivo o in prova trovato su Stripe.',
          found: false,
        })
      }

      // Trovata sottoscrizione in prova
      const sub = trialSubscriptions.data[0]
      await admin
        .from('doctors')
        .update({
          stripe_subscription_id: sub.id,
          subscription_status: 'trialing',
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        .eq('id', user.id)

      return NextResponse.json({
        message: 'Abbonamento in prova sincronizzato.',
        found: true,
        status: 'trialing',
      })
    }

    // Trovata sottoscrizione attiva
    const sub = subscriptions.data[0]
    await admin
      .from('doctors')
      .update({
        stripe_subscription_id: sub.id,
        subscription_status: 'active',
        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      })
      .eq('id', user.id)

    return NextResponse.json({
      message: 'Abbonamento attivo sincronizzato.',
      found: true,
      status: 'active',
    })
  } catch (e) {
    console.error('[stripe/sync-subscription]', e)
    return NextResponse.json(
      { error: 'Errore durante la sincronizzazione.' },
      { status: 500 },
    )
  }
}
