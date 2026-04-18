'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Copy, Check, Download, FilePlus, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import {
  loadGeneratedDocuments,
  saveGeneratedDocument,
  type StoredDocType,
  type StoredGeneratedDocument,
} from '@/lib/generated-documents-storage'

type DocumentType = StoredDocType

type PageTab = 'genera' | 'archivio'

const ARCHIVE_LABELS: Record<StoredDocType, string> = {
  letter: 'Lettere al paziente',
  certificate: 'Certificati medici',
  referral: 'Referral',
}

export default function DocumentsPage() {
  const { doctor } = useAuth()
  const [pageTab, setPageTab] = useState<PageTab>('genera')
  const [archiveCat, setArchiveCat] = useState<StoredDocType>('letter')
  const [archiveSearch, setArchiveSearch] = useState('')
  const [docArchiveVersion, setDocArchiveVersion] = useState(0)

  const [docType, setDocType] = useState<DocumentType>('referral')
  const [patientName, setPatientName] = useState('')
  const [patientInfo, setPatientInfo] = useState('')
  const [destination, setDestination] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [openArchiveDoc, setOpenArchiveDoc] = useState<StoredGeneratedDocument | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const cat = params.get('cat') as StoredDocType | null
    const q = params.get('q')
    if (tab === 'archivio') setPageTab('archivio')
    if (cat === 'letter' || cat === 'certificate' || cat === 'referral') setArchiveCat(cat)
    if (q) setArchiveSearch(q)
  }, [])

  const [allDocs, setAllDocs] = useState<StoredGeneratedDocument[]>([])

  useEffect(() => {
    let mounted = true
    void (async () => {
      const list = await loadGeneratedDocuments()
      if (mounted) setAllDocs(list)
    })()
    return () => {
      mounted = false
    }
  }, [docArchiveVersion])

  const archivedInCategory = useMemo(() => {
    const list = allDocs.filter((d) => d.type === archiveCat)
    const q = archiveSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (d) =>
        d.patientName.toLowerCase().includes(q) || d.body.toLowerCase().includes(q)
    )
  }, [allDocs, archiveCat, archiveSearch])

  const documentTypes: { type: DocumentType; label: string; description: string }[] = [
    { type: 'referral', label: 'Referral', description: 'Lettera di consulenza specialistica' },
    { type: 'letter', label: 'Lettera', description: 'Lettera formale al paziente' },
    { type: 'certificate', label: 'Certificato', description: 'Certificato medico' },
  ]

  const generateDocument = async () => {
    if (!patientName.trim()) {
      alert('Inserisci il nome del paziente')
      return
    }

    setIsGenerating(true)
    setErrorMsg(null)
    setGeneratedDoc(null)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: docType,
          context: {
            patientName,
            patientInfo,
            destination,
            additionalInfo,
          },
        }),
      })

      let data: { document?: string; error?: string; details?: string }
      try {
        data = await response.json()
      } catch {
        throw new Error(`Risposta non valida dal server (HTTP ${response.status}).`)
      }

      if (!response.ok) {
        const msg = [data.error, data.details].filter(Boolean).join(' — ') || `Errore HTTP ${response.status}`
        throw new Error(msg)
      }

      const text = data.document != null ? String(data.document).trim() : ''
      if (!text) {
        throw new Error('Il server ha restituito un documento vuoto. Riprova.')
      }

      setGeneratedDoc(text)
      await saveGeneratedDocument({
        type: docType,
        patientName: patientName.trim(),
        body: text,
      })
      setDocArchiveVersion((n) => n + 1)
      window.dispatchEvent(new Event('medassist-docs-updated'))
    } catch (error) {
      console.error('Error generating document:', error)
      const msg = error instanceof Error ? error.message : 'Errore durante la generazione.'
      setErrorMsg(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!generatedDoc) return
    await navigator.clipboard.writeText(generatedDoc)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDocument = (text: string, filenameSuffix: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filenameSuffix
    a.click()
    URL.revokeObjectURL(url)
  }

  function cleanMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s/gm, '')
      .replace(/^-\s/gm, '')
      .trim();
  }

  const downloadPDF = (text: string, patientName: string, docType: StoredDocType, docId?: string) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = 20

    // Header background
    doc.setFillColor(240, 248, 255)
    doc.rect(0, 0, pageWidth, 45, 'F')

    // Header text - Clinic name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(25, 55, 109)
    const clinicName = doctor?.clinic || doctor?.name || 'Studio Medico'
    doc.text(clinicName, margin, y)
    y += 7

    // Doctor name and registration
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    if (doctor?.name) {
      doc.text(doctor.name, margin, y)
      y += 5
    }
    if (doctor?.albo_registration) {
      doc.text(`Iscritto all'Ordine dei Medici: ${doctor.albo_registration}`, margin, y)
      y += 5
    }
    if (doctor?.address) {
      doc.text(doctor.address, margin, y)
      y += 5
    }
    if (doctor?.phone) {
      doc.text(`Tel: ${doctor.phone}`, margin, y)
      y += 5
    }

    // Separator line
    y = 55
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15

    // Date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const today = new Date().toLocaleDateString('it-IT')
    doc.text(`Data: ${today}`, margin, y)
    y += 12

    // Patient
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text(`Paziente: ${patientName}`, margin, y)
    y += 15

    // Document body
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(50, 50, 50)

    const cleanText = cleanMarkdown(text)
    const splitText = doc.splitTextToSize(cleanText, contentWidth)
    let textLines = splitText as string[]

    // Handle pagination
    const maxY = doc.internal.pageSize.getHeight() - 60 // Leave space for signature

    for (let i = 0; i < textLines.length; i++) {
      if (y > maxY) {
        doc.addPage()
        y = 20
      }
      doc.text(textLines[i], margin, y)
      y += 6
    }

    // Signature space
    const pageHeight = doc.internal.pageSize.getHeight()
    const sigY = pageHeight - 40

    // Check if we need a new page for signature
    if (y > sigY - 10) {
      doc.addPage()
      y = 20
    }

    // Signature line
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.3)
    doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY)

    // Signature label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Firma del Medico', pageWidth - margin - 60, sigY + 6)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Documento generato con MedAssist`, margin, pageHeight - 10)

    // Save
    const typeLabels: Record<StoredDocType, string> = {
      letter: 'lettera',
      certificate: 'certificato',
      referral: 'referral',
    }
    const suffix = docId || Date.now().toString()
    const filename = `${typeLabels[docType]}-${patientName.replace(/\s+/g, '-')}-${suffix}.pdf`
    doc.save(filename)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documenti</h1>
        <p className="text-gray-500">
          Genera testi con AI e consulta l&apos;archivio per tipologia.
        </p>
        {doctor && (doctor.clinic || doctor.name || doctor.address || doctor.phone || doctor.albo_registration) && (
          <p className="text-sm text-medical-800 mt-2">
            Intestazione da profilo: {[doctor.clinic, doctor.name].filter(Boolean).join(' · ') || doctor.name}
            {!doctor.albo_registration && (
              <span className="text-amber-800"> — Albo mancante in Impostazioni</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setPageTab('genera')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pageTab === 'genera' ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Genera documento
        </button>
        <button
          type="button"
          onClick={() => setPageTab('archivio')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pageTab === 'archivio' ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Archivio
        </button>
      </div>

      {pageTab === 'archivio' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ARCHIVE_LABELS) as StoredDocType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setArchiveCat(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    archiveCat === t
                      ? 'bg-medical-100 text-medical-900 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {ARCHIVE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto sm:max-w-xs w-full">
              <Input
                placeholder="Cerca..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
              />
            </div>
          </div>

          {archivedInCategory.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-600 text-sm">
                Nessun documento in questa categoria. Generane uno nella scheda &quot;Genera documento&quot;.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {archivedInCategory.map((d) => (
                <Card key={d.id} className="cursor-pointer hover:shadow-md" onClick={() => setOpenArchiveDoc(d)}>
                  <CardContent className="py-4 flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{d.patientName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(d.createdAt).toLocaleString('it-IT')} · {ARCHIVE_LABELS[d.type]}
                      </p>
                      <p className="text-sm text-gray-600 mt-2 overflow-hidden max-h-10">
                        {d.body.slice(0, 160)}
                        {d.body.length > 160 ? '…' : ''}
                      </p>
                    </div>
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap">
              {errorMsg}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tipo di Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {documentTypes.map((dt) => (
                  <button
                    key={dt.type}
                    type="button"
                    onClick={() => setDocType(dt.type)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      docType === dt.type
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 mb-2 text-gray-600" />
                    <p className="font-medium text-gray-900">{dt.label}</p>
                    <p className="text-xs text-gray-500">{dt.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dettagli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome Paziente"
                placeholder=""
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />

              <Textarea
                label="Info Paziente"
                placeholder=""
                value={patientInfo}
                onChange={(e) => setPatientInfo(e.target.value)}
                rows={2}
              />

              {(docType === 'referral' || docType === 'letter') && (
                <Input
                  label={docType === 'referral' ? 'Specialista/Reparto destinatario' : 'Destinatario'}
                  placeholder=""
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              )}

              <Textarea
                label="Informazioni Aggiuntive"
                placeholder=""
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={4}
              />

              <Button onClick={generateDocument} loading={isGenerating} className="w-full">
                <FilePlus className="w-4 h-4" />
                Genera Documento
              </Button>
            </CardContent>
          </Card>

          {generatedDoc && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle>Documento Generato</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        downloadDocument(
                          generatedDoc,
                          `${docType}-${patientName.replace(/\s+/g, '-')}-${Date.now()}.txt`
                        )
                      }
                    >
                      <Download className="w-4 h-4" />
                      Scarica TXT
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadPDF(generatedDoc, patientName, docType)}
                    >
                      <FileDown className="w-4 h-4" />
                      Scarica PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPageTab('archivio')}>
                      Vai all&apos;archivio
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg font-sans text-sm max-h-[480px] overflow-y-auto">
                  {generatedDoc}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {openArchiveDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{openArchiveDoc.patientName}</h2>
                <p className="text-xs text-gray-500">
                  {new Date(openArchiveDoc.createdAt).toLocaleString('it-IT')} ·{' '}
                  {ARCHIVE_LABELS[openArchiveDoc.type]}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(openArchiveDoc.body)
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadDocument(
                      openArchiveDoc.body,
                      `${openArchiveDoc.type}-${openArchiveDoc.patientName.replace(/\s+/g, '-')}-${openArchiveDoc.id}.txt`
                    )
                  }
                  title="Scarica TXT"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadPDF(
                      openArchiveDoc.body,
                      openArchiveDoc.patientName,
                      openArchiveDoc.type,
                      openArchiveDoc.id
                    )
                  }
                  title="Scarica PDF"
                >
                  <FileDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpenArchiveDoc(null)}>
                  Chiudi
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap text-gray-800 text-sm font-sans">{openArchiveDoc.body}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
