'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mic, Calendar, User, FileText, X, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import {
  archiveVisit,
  deleteVisit,
  loadVisits,
  type StoredVisit,
  unarchiveVisit,
} from '@/lib/visits-storage'

function visitTitle(v: StoredVisit): string {
  if (v.title?.trim()) return v.title.trim()
  const ctx = v.patientContext?.trim()
  if (ctx) {
    const line = ctx.split('\n')[0]?.trim()
    if (line && line.length <= 80) return line
    if (line) return `${line.slice(0, 77)}…`
  }
  const t = v.transcription?.trim().slice(0, 60)
  if (t) return (t + (v.transcription.length > 60 ? '…' : '')) || 'Visita'
  return 'Visita'
}

function visitSummarySnippet(v: StoredVisit): string {
  return v.clinicalNote.summary?.trim() || v.clinicalNote.assessment?.trim() || '—'
}

export default function VisitsPage() {
  const [tab, setTab] = useState<'attive' | 'archiviate'>('attive')
  const [visits, setVisits] = useState<StoredVisit[]>([])
  const [detail, setDetail] = useState<StoredVisit | null>(null)

  useEffect(() => {
    setVisits(loadVisits({ includeArchived: true }))
  }, [])

  const refresh = () => setVisits(loadVisits({ includeArchived: true }))

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'medassist_visits') refresh()
    }
    const onLocal = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('medassist-visits-updated', onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('medassist-visits-updated', onLocal)
    }
  }, [])

  const activeVisits = visits.filter((v) => !v.archived)
  const archivedVisits = visits.filter((v) => v.archived)
  const shownVisits = tab === 'attive' ? activeVisits : archivedVisits

  const onArchiveToggle = (visit: StoredVisit) => {
    if (visit.archived) {
      unarchiveVisit(visit.id)
    } else {
      archiveVisit(visit.id)
    }
    refresh()
    window.dispatchEvent(new Event('medassist-visits-updated'))
  }

  const onDelete = (visit: StoredVisit) => {
    const ok = window.confirm(`Confermi eliminazione della visita "${visitTitle(visit)}"?`)
    if (!ok) return
    deleteVisit(visit.id)
    if (detail?.id === visit.id) setDetail(null)
    refresh()
    window.dispatchEvent(new Event('medassist-visits-updated'))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visite</h1>
          <p className="text-gray-500">
            Visite elaborate da &quot;Nuova visita&quot; con trascrizione completa e nota clinica SOAP.
          </p>
        </div>
        <Link href="/dashboard/visits/new">
          <Button>
            <Mic className="w-4 h-4" />
            Nuova Visita
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant={tab === 'attive' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('attive')}>
          Attive ({activeVisits.length})
        </Button>
        <Button type="button" variant={tab === 'archiviate' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('archiviate')}>
          Archiviate ({archivedVisits.length})
        </Button>
      </div>

      {shownVisits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            <p className="mb-4">
              {tab === 'attive' ? 'Non ci sono visite attive.' : 'Non ci sono visite archiviate.'}
            </p>
            {tab === 'attive' && (
              <Link href="/dashboard/visits/new">
                <Button variant="secondary">Vai a Nuova visita</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shownVisits.map((visit) => (
            <Card key={visit.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-medical-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{visitTitle(visit)}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(visit.createdAt).toLocaleString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => setDetail(visit)}>
                      <FileText className="w-4 h-4" />
                      Leggi
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onArchiveToggle(visit)}
                    >
                      {visit.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      {visit.archived ? 'Ripristina' : 'Archivia'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(visit)}>
                      <Trash2 className="w-4 h-4" />
                      Cancella
                    </Button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 max-h-12 overflow-hidden">{visitSummarySnippet(visit)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="visit-detail-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="visit-detail-title" className="text-lg font-semibold text-gray-900 truncate pr-4">
                Visita completa
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-6 text-sm">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Titolo visita</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{visitTitle(detail)}</p>
                </CardContent>
              </Card>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contesto (pre-registrazione)</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {detail.patientContext?.trim() || '—'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Trascrizione integrale</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {detail.transcription}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Nota clinica (SOAP)</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-800">Soggettivo</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{detail.clinicalNote.subjective}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-800">Obiettivo</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{detail.clinicalNote.objective}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-800">Valutazione</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{detail.clinicalNote.assessment}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-800">Piano</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{detail.clinicalNote.plan}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-800">Riassunto</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{detail.clinicalNote.summary}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
