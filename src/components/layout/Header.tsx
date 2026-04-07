'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Search, User, FileText, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Patient } from '@/lib/patient-types'
import { filterPatientsByQuery } from '@/lib/patient-types'
import { loadGeneratedDocuments } from '@/lib/generated-documents-storage'

const ARCHIVE_CAT: Record<string, 'letter' | 'certificate' | 'referral'> = {
  letter: 'letter',
  certificate: 'certificate',
  referral: 'referral',
}

export function Header() {
  const router = useRouter()
  const { doctor } = useAuth()
  const displayName = doctor?.name?.trim() || 'Medico'
  const displayRole = doctor?.specialization?.trim() || 'Profilo'

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [docTick, setDocTick] = useState(0)
  const [patientTick, setPatientTick] = useState(0)
  const [patientsFromApi, setPatientsFromApi] = useState<Patient[]>([])
  const [unread, setUnread] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = () => setDocTick((n) => n + 1)
    window.addEventListener('storage', onDoc)
    window.addEventListener('medassist-docs-updated', onDoc)
    const onPatients = () => setPatientTick((n) => n + 1)
    window.addEventListener('medassist-patients-updated', onPatients)
    return () => {
      window.removeEventListener('storage', onDoc)
      window.removeEventListener('medassist-docs-updated', onDoc)
      window.removeEventListener('medassist-patients-updated', onPatients)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/patients', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && Array.isArray(data.patients)) {
          setPatientsFromApi(data.patients)
        }
      } catch {
        if (!cancelled) setPatientsFromApi([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [patientTick])

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/inbox/unread-count', { credentials: 'include' })
        const d = await r.json()
        setUnread(typeof d.count === 'number' ? d.count : 0)
      } catch {
        setUnread(0)
      }
    }
    void load()
    const t = setInterval(load, 60_000)
    const onVis = () => void load()
    const onInbox = () => void load()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('medassist-inbox-updated', onInbox)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('medassist-inbox-updated', onInbox)
    }
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const query = q.trim()
  const patients = useMemo(() => {
    if (query.length < 1) return []
    return filterPatientsByQuery(patientsFromApi, query).slice(0, 6)
  }, [query, patientsFromApi])
  const documents = useMemo(() => {
    if (query.length < 1) return []
    void docTick
    const qlower = query.toLowerCase()
    return loadGeneratedDocuments()
      .filter(
        (d) =>
          d.patientName.toLowerCase().includes(qlower) || d.body.toLowerCase().includes(qlower)
      )
      .slice(0, 6)
  }, [query, docTick])

  const showDropdown = open && query.length >= 1

  const goPatients = () => {
    router.push(`/dashboard/patients?q=${encodeURIComponent(query)}`)
    setOpen(false)
    setQ('')
  }

  const goDoc = (type: string, search: string) => {
    const cat = ARCHIVE_CAT[type] ?? 'letter'
    router.push(
      `/dashboard/documents?tab=archivio&cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(search)}`
    )
    setOpen(false)
    setQ('')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative min-w-0" ref={wrapRef}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input
            type="search"
            placeholder="Cerca pazienti, documenti…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.length >= 1) {
                e.preventDefault()
                goPatients()
              }
            }}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg w-72 max-w-[40vw] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {showDropdown && (
            <div className="absolute left-0 top-full mt-1 w-96 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 max-h-80 overflow-y-auto">
              {patients.length === 0 && documents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">Nessun risultato.</p>
              ) : (
                <>
                  {patients.length > 0 && (
                    <>
                      <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Pazienti
                      </p>
                      {patients.map((p) => (
                        <Link
                          key={p.id}
                          href={`/dashboard/patients?q=${encodeURIComponent(p.name)}`}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setOpen(false)
                            setQ('')
                          }}
                        >
                          <Users className="w-4 h-4 text-medical-600 flex-shrink-0" />
                          <span className="truncate text-gray-800">{p.name}</span>
                          <span className="text-gray-400 truncate text-xs ml-auto">{p.email}</span>
                        </Link>
                      ))}
                    </>
                  )}
                  {documents.length > 0 && (
                    <>
                      <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">
                        Documenti generati
                      </p>
                      {documents.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm w-full text-left"
                          onClick={() => goDoc(d.type, query)}
                        >
                          <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className="truncate text-gray-800">{d.patientName}</span>
                          <span className="text-gray-400 text-xs ml-auto flex-shrink-0">{d.type}</span>
                        </button>
                      ))}
                    </>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-primary-700 hover:bg-primary-50"
                      onClick={goPatients}
                    >
                      Vedi tutti i pazienti filtrati →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <Link
          href="/dashboard/inbox"
          className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Inbox messaggi"
          title={unread > 0 ? `${unread} non letti` : 'Inbox'}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-semibold">
              {unread > 99 ? '99' : unread}
            </span>
          ) : null}
        </Link>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-sm min-w-0 hidden sm:block">
            <p className="font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-gray-500 text-xs truncate">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
