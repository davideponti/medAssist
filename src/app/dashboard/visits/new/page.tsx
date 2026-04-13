'use client'

import { useMemo, useState, useRef } from 'react'
import { Mic, Square, Loader2, Copy, Check, Download, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { saveVisit, updateVisit } from '@/lib/visits-storage'

type ClinicalNote = {
  subjective: string
  objective: string
  assessment: string
  plan: string
  summary: string
}

export default function NewVisitPage() {
  const [visitTitle, setVisitTitle] = useState('')
  const [consentTranscription, setConsentTranscription] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [isTranscriptionVerified, setIsTranscriptionVerified] = useState(false)
  const [isSoapGenerating, setIsSoapGenerating] = useState(false)
  const [clinicalNote, setClinicalNote] = useState<ClinicalNote | null>(null)
  const [patientContext, setPatientContext] = useState('')
  const [diagnosisCorrection, setDiagnosisCorrection] = useState('')
  const [therapyCorrection, setTherapyCorrection] = useState('')
  const [followupCorrection, setFollowupCorrection] = useState('')
  const [warningsChecked, setWarningsChecked] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [error, setError] = useState<string | null>(null)
  const [soapError, setSoapError] = useState<string | null>(null)
  const verificationWarnings = useMemo(
    () => buildVerificationWarnings(transcription, diagnosisCorrection, therapyCorrection, followupCorrection),
    [transcription, diagnosisCorrection, therapyCorrection, followupCorrection]
  )

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
      setIsTranscriptionVerified(false)
      setClinicalNote(null)
      setDiagnosisCorrection('')
      setTherapyCorrection('')
      setFollowupCorrection('')
      setWarningsChecked(false)
      setSavedVisitId(null)
    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Errore durante la elaborazione. Riprova.')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateSOAP = async () => {
    const titleTrim = visitTitle.trim()
    if (!/^visita a\b/i.test(titleTrim)) {
      setSoapError('Titolo visita *: usa il formato "Visita a... (nome)".')
      return
    }
    if (!isTranscriptionVerified) return
    if (verificationWarnings.length > 0 && !warningsChecked) {
      setSoapError('Verifica i punti segnalati nella sezione "Da verificare" prima di generare la SOAP.')
      return
    }
    setIsSoapGenerating(true)
    setSoapError(null)

    try {
      const corrections = {
        diagnosis: diagnosisCorrection || undefined,
        therapy: therapyCorrection || undefined,
        followup: followupCorrection || undefined,
      }

      const response = await fetch('/api/soap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription,
          patientContext: patientContext || undefined,
          corrections,
        }),
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Impossibile generare la nota SOAP.')
      }

      setClinicalNote(data.clinicalNote)

      // Memorizziamo nel browser anche eventuali correzioni del medico,
      // così la visita è riproducibile.
      const parts = [
        diagnosisCorrection.trim()
          ? `Diagnosi/Valutazione (da confermare):\n${diagnosisCorrection.trim()}`
          : null,
        therapyCorrection.trim()
          ? `Terapia/Prescrizioni (da confermare):\n${therapyCorrection.trim()}`
          : null,
        followupCorrection.trim()
          ? `Follow-up/Piano (da confermare):\n${followupCorrection.trim()}`
          : null,
      ].filter(Boolean) as string[]

      const correctionsBlock = parts.join('\n\n')
      const storedPatientContext = correctionsBlock
        ? [patientContext?.trim() || '', `Correzioni del medico (da incorporare):\n${correctionsBlock}`]
            .filter((x) => x.trim().length > 0)
            .join('\n\n')
        : patientContext?.trim() || ''

      const saved = saveVisit({
        title: titleTrim,
        archived: false,
        patientContext: storedPatientContext,
        transcription,
        clinicalNote: data.clinicalNote,
      })
      setSavedVisitId(saved.id)
      window.dispatchEvent(new Event('medassist-visits-updated'))
    } catch (e) {
      console.error('SOAP generation error:', e)
      const msg = e instanceof Error ? e.message : 'Impossibile generare la SOAP.'
      setSoapError(msg)
    } finally {
      setIsSoapGenerating(false)
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
        <p className="text-gray-500">
          Registra la visita, trascrivi il testo e genera la nota SOAP dopo conferma del medico
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Titolo visita *</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder=""
            value={visitTitle}
            onChange={(e) => setVisitTitle(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contesto Paziente</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder=""
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
            <div className="space-y-4">
              <Textarea
                label="Trascrizione (modificabile)"
                value={transcription}
                onChange={(e) => {
                  setTranscription(e.target.value)
                  // Se il testo cambia, la conferma non è più valida.
                  setIsTranscriptionVerified(false)
                  setClinicalNote(null)
                  setSoapError(null)
                  setWarningsChecked(false)
                }}
                rows={7}
              />

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-medical-600 focus:ring-primary-500"
                  checked={isTranscriptionVerified}
                  onChange={(e) => {
                    const next = e.target.checked
                    setIsTranscriptionVerified(next)
                    if (!next) {
                      setClinicalNote(null)
                      setSoapError(null)
                      setWarningsChecked(false)
                    }
                  }}
                />
                <span className="text-sm text-gray-700 leading-snug">
                  Verificato trascritto (confermo che il testo è corretto)
                </span>
              </label>

              {isTranscriptionVerified && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-medium text-sm text-gray-900">Correzione rapida</h4>

                  <Textarea
                    label="Diagnosi/Valutazione (da confermare)"
                    value={diagnosisCorrection}
                    onChange={(e) => {
                      setDiagnosisCorrection(e.target.value)
                      setWarningsChecked(false)
                    }}
                    rows={3}
                  />
                  <Textarea
                    label="Terapia/Prescrizioni (da confermare)"
                    value={therapyCorrection}
                    onChange={(e) => {
                      setTherapyCorrection(e.target.value)
                      setWarningsChecked(false)
                    }}
                    rows={3}
                  />
                  <Textarea
                    label="Follow-up/Piano (da confermare)"
                    value={followupCorrection}
                    onChange={(e) => {
                      setFollowupCorrection(e.target.value)
                      setWarningsChecked(false)
                    }}
                    rows={3}
                  />

                  {verificationWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
                      <p className="font-medium">Da verificare prima della generazione SOAP</p>
                      <ul className="list-disc ml-5 space-y-1">
                        {verificationWarnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-medical-600 focus:ring-primary-500"
                          checked={warningsChecked}
                          onChange={(e) => setWarningsChecked(e.target.checked)}
                        />
                        <span className="text-xs">
                          Ho verificato i punti segnalati e confermo che i dati inseriti sono corretti.
                        </span>
                      </label>
                    </div>
                  )}

                  <Button
                    type="button"
                    className="w-full"
                    disabled={
                      !isTranscriptionVerified ||
                      isSoapGenerating ||
                      (verificationWarnings.length > 0 && !warningsChecked)
                    }
                    loading={isSoapGenerating}
                    onClick={generateSOAP}
                  >
                    Genera SOAP
                  </Button>
                </div>
              )}

              {soapError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {soapError}
                </div>
              )}
            </div>
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
                onSave={(next) => {
                  const updated = { ...clinicalNote, subjective: next }
                  setClinicalNote(updated)
                  if (savedVisitId) updateVisit(savedVisitId, { clinicalNote: updated })
                }}
                onCopy={() => copyToClipboard(clinicalNote.subjective, 'subjective')}
                copied={copied === 'subjective'}
              />
              <SOAPSection
                title="Obiettivo"
                content={clinicalNote.objective}
                onSave={(next) => {
                  const updated = { ...clinicalNote, objective: next }
                  setClinicalNote(updated)
                  if (savedVisitId) updateVisit(savedVisitId, { clinicalNote: updated })
                }}
                onCopy={() => copyToClipboard(clinicalNote.objective, 'objective')}
                copied={copied === 'objective'}
              />
              <SOAPSection
                title="Valutazione"
                content={clinicalNote.assessment}
                onSave={(next) => {
                  const updated = { ...clinicalNote, assessment: next }
                  setClinicalNote(updated)
                  if (savedVisitId) updateVisit(savedVisitId, { clinicalNote: updated })
                }}
                onCopy={() => copyToClipboard(clinicalNote.assessment, 'assessment')}
                copied={copied === 'assessment'}
              />
              <SOAPSection
                title="Piano"
                content={clinicalNote.plan}
                onSave={(next) => {
                  const updated = { ...clinicalNote, plan: next }
                  setClinicalNote(updated)
                  if (savedVisitId) updateVisit(savedVisitId, { clinicalNote: updated })
                }}
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
              <SOAPSection
                title="Riassunto"
                content={clinicalNote.summary}
                onSave={(next) => {
                  const updated = { ...clinicalNote, summary: next }
                  setClinicalNote(updated)
                  if (savedVisitId) updateVisit(savedVisitId, { clinicalNote: updated })
                }}
                onCopy={() => copyToClipboard(clinicalNote.summary, 'summary')}
                copied={copied === 'summary'}
                variant="summary"
              />
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
  onSave,
  onCopy,
  copied,
  variant = 'default',
}: {
  title: string
  content: string
  onSave: (next: string) => void
  onCopy: () => void
  copied: boolean
  variant?: 'default' | 'summary'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)

  return (
    <div className={variant === 'summary' ? '' : 'border-b border-gray-100 pb-4 last:border-0'}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{title}</h4>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!editing) setDraft(content)
              setEditing(!editing)
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={editing ? 'Annulla modifica' : 'Modifica'}
          >
            <Pencil className="w-4 h-4" />
          </button>

          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(content)
                  setEditing(false)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Annulla"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(draft)
                  setEditing(false)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Salva"
              >
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCopy}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Copia"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={variant === 'summary' ? 4 : 5} />
      ) : variant === 'summary' ? (
        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{content}</p>
      ) : (
        <p className="text-gray-600 text-sm whitespace-pre-wrap">{content}</p>
      )}
    </div>
  )
}

function buildVerificationWarnings(
  transcription: string,
  diagnosisCorrection: string,
  therapyCorrection: string,
  followupCorrection: string
): string[] {
  const text = `${transcription}\n${diagnosisCorrection}\n${therapyCorrection}\n${followupCorrection}`.toLowerCase()
  const warnings: string[] = []

  // PA con sistolica = diastolica: spesso errore di trascrizione o misura.
  const paMatches = text.match(/\b(\d{2,3})\s*(?:\/|su)\s*(\d{2,3})\b/g) || []
  for (const m of paMatches) {
    const nums = m.match(/\d{2,3}/g)
    if (!nums) continue
    const s = Number(nums[0])
    const d = Number(nums[1])
    if (s === d) {
      warnings.push(`Pressione arteriosa potenzialmente incoerente (${s}/${d}): ricontrollare il valore.`)
      break
    }
  }

  if (/\bantiz[a-z]+|antimosc[a-z]*|antiebol[a-z]*|antizanz[a-z]*\b/.test(text)) {
    warnings.push('Vaccini/farmaci riportati con nomi non standard: verificare la denominazione corretta.')
  }

  if (/\btrib[uù]\b|\bafrica trib/.test(text)) {
    warnings.push('Linguaggio potenzialmente improprio/stigmatizzante: riscrivere in forma clinica neutra.')
  }

  if (/\bchifurin[a-z]*\b|\btachibrin[a-z]*\b/.test(text)) {
    warnings.push('Farmaco con nome dubbio o trascritto male: verificare principio attivo, dose e frequenza.')
  }

  return Array.from(new Set(warnings))
}
