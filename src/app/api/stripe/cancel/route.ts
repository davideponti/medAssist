import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe-server'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/cancel
 *
 * Cancella l'abbonamento Stripe a fine periodo corrente (cancel_at_period_end: true).
 * L'account resta attivo fino alla scadenza; nessun rimborso immediato.
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
    const rl = await rateLimit(`stripe-cancel:${user.id}:${ip}`, 5, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    // ── Recupera subscription dal profilo medico ──────────
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
    const admin = getSupabaseAdmin()

    const { data: doctor, error: dbError } = await admin
      .from('doctors')
      .select('stripe_subscription_id, subscription_status, cancel_at_period_end')
      .eq('id', user.id)
      .single()

    if (dbError || !doctor) {
      return NextResponse.json({ error: 'Profilo medico non trovato.' }, { status: 404 })
    }

    if (!doctor.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Nessun abbonamento attivo trovato.' },
        { status: 400 },
      )
    }

    if (doctor.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'La cancellazione è già programmata.' },
        { status: 400 },
      )
    }

    const allowedStatuses = ['active', 'trialing']
    if (!allowedStatuses.includes(doctor.subscription_status ?? '')) {
      return NextResponse.json(
        { error: `Impossibile cancellare un abbonamento con stato "${doctor.subscription_status}".` },
        { status: 400 },
      )
    }

    // ── Cancella su Stripe ────────────────────────────────
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(doctor.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // ── Aggiorna il record in Supabase ────────────────────
    await admin
      .from('doctors')
      .update({
        cancel_at_period_end: true,
        // Aggiorna current_period_end nel caso non fosse già sincronizzato
        current_period_end: new Date((updated as any).current_period_end * 1000).toISOString(),
      })
      .eq('id', user.id)

    const startDate = new Date((updated as any).current_period_start * 1000)
    const endDate = new Date((updated as any).current_period_end * 1000)

    const endDateFormatted = endDate.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return NextResponse.json({
      message: `Abbonamento cancellato. L'accesso resterà attivo fino al ${endDateFormatted}.`,
      cancel_at_period_end: true,
      current_period_start: (updated as any).current_period_start,
      current_period_start_iso: startDate.toISOString(),
      current_period_end: (updated as any).current_period_end,
      current_period_end_iso: endDate.toISOString(),
      current_period_end_formatted: endDateFormatted,
    })
  } catch (e) {
    console.error('[stripe/cancel]', e)
    return NextResponse.json(
      { error: 'Errore durante la cancellazione. Riprova o contatta il supporto.' },
      { status: 500 },
    )
  }
}
