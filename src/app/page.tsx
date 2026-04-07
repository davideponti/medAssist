import Link from 'next/link'
import { Stethoscope, Mic, FileText, Inbox, Clock, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-primary-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-medical-100 text-medical-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Stethoscope className="w-4 h-4" />
            AI Administrative Assistant
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            MedAssist AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Risparmia ore ogni giorno. Trascrizione automatica delle visite, 
            generazione documenti e gestione inbox pazienti con AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={Mic}
            title="Trascrizione Visite"
            description="Converti audio in note cliniche strutturate in formato SOAP automaticamente"
          />
          <FeatureCard
            icon={FileText}
            title="Generazione Documenti"
            description="Crea referral, certificati e lettere al paziente con un click"
          />
          <FeatureCard
            icon={Inbox}
            title="Gestione Inbox"
            description="Risposte AI ai messaggi dei pazienti, suggerimenti azioni"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Quanto tempo risparmi?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <StatItem value="2-4h" label="al giorno su documentazione" />
            <StatItem value="30min" label="per visita risparmiate" />
            <StatItem value="€150+" label="valore per ora risparmiata" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/prova-gratuita"
              className="bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-colors"
            >
              Inizia Gratis
            </Link>
            <Link
              href="/login"
              className="bg-white text-gray-800 border border-gray-200 px-6 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
            >
              Accedi
            </Link>
            <Link
              href="/signup"
              className="text-medical-700 font-semibold px-4 py-4 hover:underline"
            >
              Registrati
            </Link>
          </div>
          <p className="text-gray-500 text-sm">Setup in pochi minuti</p>
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-medical-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-bold text-primary-600 mb-2">{value}</p>
      <p className="text-gray-600">{label}</p>
    </div>
  )
}
