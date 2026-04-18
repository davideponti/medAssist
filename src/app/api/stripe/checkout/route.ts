import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe-server'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

/** Abbonamento mensile con 7 giorni di prova richiede un Price ricorrente su Stripe Dashboard. */
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

    // Recupera l'utente autenticato per collegare la subscription al profilo
    const { getSessionTokenFromRequest } = await import('@/lib/auth-session')
    const { createUserSupabase } = await import('@/lib/supabase-user')
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
    const token = getSessionTokenFromRequest(request)
    let clientReferenceId: string | undefined
    let existingCustomerId: string | null = null
    let hasUsedTrial = false
    let customerEmail: string | undefined
    if (token) {
      const supabase = createUserSupabase(token)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        clientReferenceId = user.id
        customerEmail = user.email
        // Check anti-abuse trial: verifica se l'utente ha già un customer
        // o ha mai avuto un subscription (anche cancellata)
        const admin = getSupabaseAdmin()
        const { data: doc } = await admin
          .from('doctors')
          .select('stripe_customer_id, stripe_subscription_id, subscription_status')
          .eq('id', user.id)
          .single()
        if (doc?.stripe_customer_id) {
          existingCustomerId = doc.stripe_customer_id
          // Verifica su Stripe se ha già avuto un trial
          try {
            const subs = await stripe.subscriptions.list({
              customer: doc.stripe_customer_id,
              status: 'all',
              limit: 5,
            })
            hasUsedTrial = subs.data.some(
              (s) => s.trial_start !== null || s.trial_end !== null || s.status === 'canceled'
            )
          } catch (e) {
            console.warn('Trial check failed:', e)
          }
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Collega la sessione all'utente per il webhook
      client_reference_id: clientReferenceId,
      // Usa customer esistente se presente per evitare duplicati e trial abuse
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : customerEmail
          ? { customer_email: customerEmail }
          : {}),
      // Trial SOLO se non ne ha già usato uno
      ...(hasUsedTrial
        ? {}
        : {
            subscription_data: {
              trial_period_days: 7,
            },
          }),
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