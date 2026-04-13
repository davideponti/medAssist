import Link from 'next/link'

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary-700 hover:text-primary-900">
            Torna alla home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">DPA (Data Processing Agreement) - Template Generico</h1>
          <p className="text-sm text-gray-500 mt-2">Ultimo aggiornamento: 07/04/2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-gray-800">
          <p>
            Questo modello disciplina la nomina a Responsabile del trattamento ai sensi dell&apos;art. 28 GDPR tra Cliente
            (Titolare) e MedAssist AI (Responsabile).
          </p>

          <h2>Parti</h2>
          <p>
            Responsabile del trattamento: Davide Ponticorvo, CF PNTDVD06P21G568Y, Via Montariello 8, Italia, email
            iamedassist@gmail.com. Titolare: Cliente che sottoscrive il servizio.
          </p>

          <h2>Chiarimento ruoli GDPR</h2>
          <p>
            Per i dati dei pazienti trattati nello studio medico, il Cliente e Titolare del trattamento; MedAssist AI e
            Responsabile del trattamento nominato ai sensi dell&apos;art. 28 GDPR.
          </p>

          <h2>Oggetto, natura e finalita</h2>
          <p>
            Trattamento di dati personali necessario all&apos;erogazione del servizio software MedAssist AI, incluse
            funzionalita operative e supporto tecnico.
          </p>

          <h2>Istruzioni del Titolare</h2>
          <p>
            Il Responsabile tratta i dati solo su istruzione documentata del Titolare, salvo obblighi di legge.
          </p>

          <h2>Misure di sicurezza</h2>
          <p>
            Il Responsabile adotta misure tecniche e organizzative adeguate, inclusi controllo accessi, protezione delle
            credenziali, cifratura in transito, monitoraggio e backup.
          </p>

          <h2>Data breach</h2>
          <p>
            In caso di violazione dei dati personali, il Responsabile informa il Titolare senza ingiustificato ritardo e,
            ove possibile, entro 48 ore dalla rilevazione, collaborando agli adempimenti GDPR inclusa l&apos;eventuale
            notifica entro 72 ore quando applicabile.
          </p>

          <h2>Sub-responsabili</h2>
          <p>
            Il Titolare autorizza l&apos;uso dei seguenti sub-responsabili necessari al servizio: Supabase, OpenAI,
            Stripe, e altri fornitori tecnici equivalenti eventualmente indicati in aggiornamenti contrattuali.
          </p>

          <h2>Trasferimenti extra SEE</h2>
          <p>
            Eventuali trasferimenti verso paesi terzi avvengono nel rispetto del Capo V GDPR e delle garanzie applicabili.
          </p>

          <h2>Durata, restituzione e cancellazione</h2>
          <p>
            Il DPA resta efficace per tutta la durata del rapporto. Alla cessazione, i dati sono restituiti o cancellati
            secondo istruzioni del Titolare e obblighi di legge, con periodo tecnico massimo di conservazione pari a 30
            giorni salvo obblighi differenti.
          </p>

          <h2>Diritti degli interessati e audit</h2>
          <p>
            Il Responsabile assiste il Titolare nelle richieste privacy (entro tempi congrui, obiettivo 30 giorni) e
            mette a disposizione le informazioni ragionevolmente necessarie a dimostrare conformita.
          </p>

          <h2>Legge e foro</h2>
          <p>
            Legge applicabile: italiana. Foro competente: Napoli, salvo diversa previsione inderogabile di legge.
          </p>
        </div>
      </div>
    </main>
  )
}
