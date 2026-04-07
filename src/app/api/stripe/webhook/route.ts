import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'

export const dynamic = 'force-dynamic'

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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Checkout completato:', session.id, 'customer:', session.customer)
      // Qui: collegare customer/subscription a utente Supabase se necessario
      break
    }
    case 'customer.subscription.deleted':
      console.log('Abbonamento terminato:', event.data.object)
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
