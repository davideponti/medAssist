import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ count: 0 })
    }

    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ count: 0 })
    }

    const { count, error } = await supabase
      .from('patient_messages')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user.id)
      .is('read_at', null)

    if (error) {
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
