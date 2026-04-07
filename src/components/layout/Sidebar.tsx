'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Home,
  Mic,
  FileText,
  Inbox,
  Users,
  Settings,
  LogOut,
  Stethoscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/visits', icon: Mic, label: 'Visite' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documenti' },
  { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox Pazienti' },
  { href: '/dashboard/patients', icon: Users, label: 'Pazienti' },
  { href: '/dashboard/settings', icon: Settings, label: 'Impostazioni' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">MedAssist</h1>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 w-full transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Esci
          </button>
        </div>
      </nav>
    </aside>
  )
}
