import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Cache idempotency in-memory: previene doppia elaborazione dello stesso evento.
 * NOTA: per distribuzione multi-istanza, sostituire con tabella `stripe_events` in Supabase.
 */
const processedEvents = new Set<string>()
const MAX_CACHE = 5_000

function markProcessed(id: string) {
  if (processedEvents.size >= MAX_CACHE) {
    // FIFO eviction: rimuovi il primo
    const first = processedEvents.values().next().value
    if (first) processedEvents.delete(first)
  }
  processedEvents.add(id)
}

/** Endpoint per eventi Stripe (es. checkout completato). Aggiungi l’URL in Dashboard → Webhooks. */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET non impostata: webhook disabilitato')
    return NextResponse.json({ error: 'Webhook non configurato' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Firma mancante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature:', err)
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 })
  }

  // Idempotency: se già processato, ritorna 200 senza rielaborare
  if (processedEvents.has(event.id)) {
    console.log(`[stripe-webhook] Evento ${event.id} già processato, skip.`)
    return NextResponse.json({ received: true, idempotent: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Checkout completato:', session.id, 'customer:', session.customer, 'subscription:', session.subscription)

      // Salva customer_id e subscription_id nel profilo del medico
      if (session.client_reference_id && session.customer && session.subscription) {
        const adminSupabase = getSupabaseAdmin()

        const { error: updateError } = await adminSupabase
          .from('doctors')
          .update({
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer.id,
            stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
            subscription_status: 'active',
            cancel_at_period_end: false,
          })
          .eq('id', session.client_reference_id)

        if (updateError) {
          console.error('Errore aggiornamento doctor con dati Stripe:', updateError)
        }
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('Abbonamento aggiornato:', subscription.id, 'status:', subscription.status)

      // Aggiorna lo stato in Supabase
      const adminSupabase = getSupabaseAdmin()

      const currentPeriodEnd = (subscription as unknown as { current_period_end: number }).current_period_end

      const { error: updateError } = await adminSupabase
        .from('doctors')
        .update({
          subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Errore aggiornamento subscription:', updateError)
      }
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('Abbonamento terminato:', subscription.id)

      const adminSupabase = getSupabaseAdmin()

      const { error: updateError } = await adminSupabase
        .from('doctors')
        .update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Errore cancellazione subscription:', updateError)
      }
      break
    }
    default:
      break
  }

  markProcessed(event.id)
  return NextResponse.json({ received: true })
}
