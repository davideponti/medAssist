import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe-server'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

/** Abbonamento mensile con 7 giorni di prova — richiede un Price ricorrente su Stripe Dashboard. */
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const ip = getClientIp(request)
    const rl = await rateLimit(`stripe-checkout:${ip}`, 8, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste di checkout. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const priceId = process.env.STRIPE_PRICE_PROFESSIONAL?.trim()
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            'Configurazione incompleta: imposta STRIPE_PRICE_PROFESSIONAL nel file .env (ID del prezzo ricorrente in Stripe).',
        },
        { status: 500 }
      )
    }

    const stripe = getStripe()
    const origin = request.nextUrl.origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Impostiamo la prova gratuita lato API, visto che nell'interfaccia Stripe
      // non sempre è disponibile un campo diretto per il trial sulla subscription.
      subscription_data: {
        trial_period_days: 7,
      },
      // Dopo il pagamento (o l'avvio della prova) riportiamo direttamente alla dashboard.
      success_url: `${origin}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prova-gratuita/pagamento?canceled=1`,
      locale: 'it',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe non ha restituito un URL di checkout.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe checkout:', e)
    const msg =
      e instanceof Error && e.message.includes('STRIPE_SECRET_KEY')
        ? 'Chiave segreta Stripe mancante: configura STRIPE_SECRET_KEY in .env.local'
        : 'Impossibile avviare il pagamento. Verifica le chiavi Stripe e il Price ID.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
