import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, generateClinicalNote } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File
    const patientContext = formData.get('patientContext') as string | null
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

    // Generate clinical note
    const clinicalNote = await generateClinicalNote(
      transcription,
      patientContext || undefined
    )

    return NextResponse.json({
      transcription,
      clinicalNote,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}
