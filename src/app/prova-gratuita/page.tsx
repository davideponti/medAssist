import Link from 'next/link'
import { Stethoscope, Check, Mic, FileText, Inbox, Users, Sparkles } from 'lucide-react'

export default function ProvaGratuitaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-primary-50">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-medical-100 text-medical-700 px-4 py-2 rounded-full text-sm font-medium mb-5">
            <Stethoscope className="w-4 h-4" />
            MedAssist AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Inizia la tua prova gratuita di 7 giorni
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Scegli il piano più adatto allo studio. Il piano a pagamento include 7 giorni di prova senza addebito immediato sulla carta, secondo le condizioni indicate al momento del checkout.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-medical-600 uppercase tracking-wide mb-1">Piano</p>
              <h2 className="text-2xl font-bold text-gray-900">Gratis</h2>
              <p className="text-gray-500 mt-1">Per provare le funzioni principali con limiti mensili</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex gap-3 text-gray-700">
                <Check className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>20 visite</strong> registrate (trascrizione e nota clinica)
                </span>
              </li>
              <li className="flex gap-3 text-gray-700">
                <Check className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>20 generazioni</strong> di documenti (referral, lettere, certificati)
                </span>
              </li>
              <li className="flex gap-3 text-gray-400">
                <Mic className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Ideale per una prima valutazione del servizio</span>
              </li>
            </ul>
            <Link
              href="/signup?piano=gratis"
              className="block w-full text-center bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Inizia
            </Link>
            <p className="text-xs text-gray-500 text-center mt-4">
              Nessun pagamento. Creazione account e accesso immediato ai limiti del piano gratuito.
            </p>
          </section>

          <section className="bg-white rounded-2xl border-2 border-primary-500 shadow-lg p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Consigliato
            </div>
            <div className="mb-6 pr-20">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-1">Piano</p>
              <h2 className="text-2xl font-bold text-gray-900">Professionale</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                49€ <span className="text-lg font-normal text-gray-500">/ mese</span>
              </p>
              <p className="text-gray-500 mt-1">dopo i 7 giorni di prova gratuita</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex gap-3 text-gray-800">
                <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Visite registrate illimitate</strong>
                </span>
              </li>
              <li className="flex gap-3 text-gray-800">
                <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Generazioni di documenti illimitate</strong>
                </span>
              </li>
              <li className="flex gap-3 text-gray-800">
                <Inbox className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Inbox</strong> per ricevere messaggi dai pazienti tramite link dedicato
                </span>
              </li>
              <li className="flex gap-3 text-gray-800">
                <Users className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Creazione account pazienti illimitata</strong> (canale messaggistica e organizzazione)
                </span>
              </li>
              <li className="flex gap-3 text-gray-800">
                <FileText className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>Tutte le funzionalità per lo studio</span>
              </li>
            </ul>
            <Link
              href="/prova-gratuita/pagamento"
              className="block w-full text-center bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
              Inizia la tua prova gratuita di 7 giorni
            </Link>
            <p className="text-xs text-gray-500 text-center mt-4">
              Le condizioni economiche e la data di fine prova sono riepilogate nella pagina successiva, prima dell&apos;inserimento dei dati della carta.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-3">Ha già un account?</p>
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">
            Accedi
          </Link>
          <span className="text-gray-400 mx-2">·</span>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Torna alla home
          </Link>
        </div>
      </div>
    </main>
  )
}
