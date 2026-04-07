'use client'

import { useState, useRef } from 'react'
import { Mic, Square, Loader2, Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { saveVisit } from '@/lib/visits-storage'

type ClinicalNote = {
  subjective: string
  objective: string
  assessment: string
  plan: string
  summary: string
}

export default function NewVisitPage() {
  const [consentTranscription, setConsentTranscription] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [clinicalNote, setClinicalNote] = useState<ClinicalNote | null>(null)
  const [patientContext, setPatientContext] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [error, setError] = useState<string | null>(null)

  const startRecording = async () => {
    if (!consentTranscription) {
      const msg =
        'Per avviare la registrazione devi confermare di aver ottenuto il consenso del paziente alla trascrizione.'
      setError(msg)
      alert(msg)
      return
    }
    setError(null)
    
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Il tuo browser non supporta la registrazione audio. Usa Chrome, Firefox, Edge o Safari.'
      setError(errorMsg)
      alert(errorMsg)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        await processAudio(audioBlob, mimeType)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err: any) {
      console.error('Error starting recording:', err)
      
      let errorMsg = 'Impossibile accedere al microfono. '
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permesso microfono negato. Clicca sull\'icona del lucchetto nella barra degli indirizzi e consenti l\'accesso al microfono.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Nessun microfono trovato. Verifica che il microfono sia collegato.'
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Microfono già in uso da un\'altra applicazione.'
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Il microfono non supporta le impostazioni richieste.'
      } else {
        errorMsg += `Errore: ${err.name || 'Sconosciuto'}`
      }
      
      setError(errorMsg)
      alert(errorMsg)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('mimeType', mimeType)
      if (patientContext) {
        formData.append('patientContext', patientContext)
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setTranscription(data.transcription)
      setClinicalNote(data.clinicalNote)
      saveVisit({
        patientContext,
        transcription: data.transcription,
        clinicalNote: data.clinicalNote,
      })
      window.dispatchEvent(new Event('medassist-visits-updated'))
    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Errore durante la elaborazione. Riprova.')
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadNote = () => {
    if (!clinicalNote) return

    const content = `
NOTA CLINICA - ${new Date().toLocaleDateString('it-IT')}
================================

SOGGETTIVO:
${clinicalNote.subjective}

OBIETTIVO:
${clinicalNote.objective}

VALUTAZIONE:
${clinicalNote.assessment}

PIANO:
${clinicalNote.plan}

RIASSUNTO:
${clinicalNote.summary}

---
Trascrizione originale:
${transcription}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nota-clinica-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuova Visita</h1>
        <p className="text-gray-500">Registra la visita e genera automaticamente la nota clinica</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contesto Paziente (opzionale)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nome paziente, storia clinica, farmaci in corso..."
            value={patientContext}
            onChange={(e) => setPatientContext(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consenso alla trascrizione</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-medical-600 focus:ring-primary-500"
              checked={consentTranscription}
              onChange={(e) => setConsentTranscription(e.target.checked)}
            />
            <span className="text-sm text-gray-700 leading-snug">
              Confermo di aver ottenuto il consenso del paziente alla trascrizione.
            </span>
          </label>
          {!consentTranscription && (
            <p className="text-xs text-amber-800 mt-2">
              Senza questa conferma non è possibile avviare la registrazione audio.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors animate-pulse"
              >
                <Square className="w-8 h-8 text-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing || !consentTranscription}
                className="w-24 h-24 bg-medical-500 rounded-full flex items-center justify-center hover:bg-medical-600 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
            )}

            <p className="text-gray-600 text-center max-w-md">
              {isRecording
                ? 'Registrazione in corso... Clicca per fermare'
                : isProcessing
                ? 'Elaborazione in corso...'
                : !consentTranscription
                ? 'Spunta il consenso sopra per abilitare la registrazione.'
                : 'Clicca per iniziare la registrazione'}
            </p>
          </div>
        </CardContent>
      </Card>

      {transcription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trascrizione</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(transcription, 'transcription')}
              >
                {copied === 'transcription' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
          </CardContent>
        </Card>
      )}

      {clinicalNote && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nota Clinica (SOAP)</CardTitle>
                <Button variant="secondary" size="sm" onClick={downloadNote}>
                  <Download className="w-4 h-4" />
                  Scarica
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SOAPSection
                title="Soggettivo"
                content={clinicalNote.subjective}
                onCopy={() => copyToClipboard(clinicalNote.subjective, 'subjective')}
                copied={copied === 'subjective'}
              />
              <SOAPSection
                title="Obiettivo"
                content={clinicalNote.objective}
                onCopy={() => copyToClipboard(clinicalNote.objective, 'objective')}
                copied={copied === 'objective'}
              />
              <SOAPSection
                title="Valutazione"
                content={clinicalNote.assessment}
                onCopy={() => copyToClipboard(clinicalNote.assessment, 'assessment')}
                copied={copied === 'assessment'}
              />
              <SOAPSection
                title="Piano"
                content={clinicalNote.plan}
                onCopy={() => copyToClipboard(clinicalNote.plan, 'plan')}
                copied={copied === 'plan'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riassunto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                {clinicalNote.summary}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SOAPSection({
  title,
  content,
  onCopy,
  copied,
}: {
  title: string
  content: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <button
          onClick={onCopy}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-gray-600 text-sm">{content}</p>
    </div>
  )
}
