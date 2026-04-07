import 'server-only'
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY non configurata')
  }
  if (!_stripe) {
    _stripe = new Stripe(key, {
      typescript: true,
    })
  }
  return _stripe
}
