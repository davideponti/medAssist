import { NextRequest, NextResponse } from 'next/server'
import { generatePatientResponse } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, patientContext, previousContext } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message required' },
        { status: 400 }
      )
    }

    const result = await generatePatientResponse(
      message,
      patientContext,
      previousContext
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Inbox response error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
