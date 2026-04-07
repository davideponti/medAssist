import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Client Supabase con JWT utente (RLS su `doctors`). Solo route API. */
export function createUserSupabase(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}
