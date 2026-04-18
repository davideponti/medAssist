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
    const rawMimeType = formData.get('mimeType') as string | null

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio file required' },
        { status: 400 }
      )
    }

    // Limite dimensione audio: 25 MB (limite Whisper = 25 MB)
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024
    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'File audio troppo grande (max 25MB).' },
        { status: 413 }
      )
    }
    if (audio.size < 100) {
      return NextResponse.json(
        { error: 'File audio vuoto o troppo piccolo.' },
        { status: 400 }
      )
    }

    // Whitelist MIME type audio
    const ALLOWED_MIMES = new Set([
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3',
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/ogg', 'audio/flac', 'audio/m4a', 'audio/x-m4a',
    ])
    const clientType = (rawMimeType || audio.type || '').toLowerCase().trim()
    const safeMimeType = ALLOWED_MIMES.has(clientType) ? clientType : 'audio/webm'

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audio.arrayBuffer())

    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, safeMimeType)

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
