import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/openai'
import { getSessionTokenFromRequest } from '@/lib/auth-session'
import { createUserSupabase } from '@/lib/supabase-user'
import { getClientIp, isAllowedOrigin, rateLimit } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origine richiesta non consentita.' }, { status: 403 })
    }
    const token = getSessionTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const supabase = createUserSupabase(token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 })
    const ip = getClientIp(request)
    const rl = await rateLimit(`transcribe:${user.id}:${ip}`, 20, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste di trascrizione. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File
    const mimeType = formData.get('mimeType') as string | null

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio file required' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audio.arrayBuffer())

    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, mimeType || audio.type || 'audio/webm')

    return NextResponse.json({
      transcription,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}
