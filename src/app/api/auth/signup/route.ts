import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { validatePasswordStrength } from '@/lib/password-policy'

export async function POST(request: NextRequest) {
  try {
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
    const body = await request.json()
    const { email, password, name, specialization, clinic, address, phone } = body

    if (!email || !password || !name || !specialization) {
      return NextResponse.json(
        { error: 'Email, password, name and specialization are required' },
        { status: 400 }
      )
    }

    const pwdCheck = validatePasswordStrength(String(password))
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
        clinic,
        address,
        phone,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
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
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        {
          error: 'Impossibile creare il profilo medico. Controlla la tabella doctors su Supabase.',
          details: profileError.message,
          code: profileError.code,
        },
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
