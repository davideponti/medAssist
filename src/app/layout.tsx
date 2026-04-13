import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MedAssist AI - Assistente Amministrativo per Studi Medici',
  description: 'AI-powered administrative assistant for medical practices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Providers>
          {children}
          <footer className="border-t border-gray-100 bg-white">
            <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-600 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p>MedAssist AI - Informazioni legali e privacy</p>
              <div className="flex items-center gap-4">
                <Link href="/termini-e-condizioni" className="hover:text-gray-900 hover:underline">
                  Termini
                </Link>
                <Link href="/privacy-policy" className="hover:text-gray-900 hover:underline">
                  Privacy
                </Link>
                <Link href="/dpa" className="hover:text-gray-900 hover:underline">
                  DPA
                </Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
