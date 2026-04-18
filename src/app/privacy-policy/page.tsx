import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary-700 hover:text-primary-900">
            Torna alla home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Privacy Policy - medincly</h1>
          <p className="text-sm text-gray-500 mt-2">Ultimo aggiornamento: 07/04/2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-gray-800">
          <p>
            Titolare del trattamento: Davide Ponticorvo (CF PNTDVD06P21G568Y), Via Montariello 8, Italia, email:
            iamedassist@gmail.com.
          </p>

          <h2>1. Dati trattati</h2>
          <p>
            Dati anagrafici e di contatto, dati di autenticazione, dati inseriti dall&apos;utente nell&apos;applicazione,
            metadati tecnici e log di sicurezza. In base all&apos;uso del servizio, possono essere trattati dati
            appartenenti a categorie particolari ai sensi dell&apos;art. 9 GDPR.
          </p>

          <h2>1-bis. Ruoli privacy</h2>
          <p>
            Per i dati dei propri pazienti, il medico/struttura cliente agisce come Titolare del trattamento. medincly
            agisce come Responsabile del trattamento ai sensi dell&apos;art. 28 GDPR, secondo DPA dedicato.
          </p>

          <h2>2. Finalita e base giuridica</h2>
          <p>
            Erogazione del servizio richiesto (art. 6.1.b GDPR), adempimenti legali (art. 6.1.c), sicurezza e tutela del
            sistema (art. 6.1.f), eventuali comunicazioni operative sul servizio (art. 6.1.b/f).
          </p>

          <h2>3. Conservazione</h2>
          <p>
            I dati sono conservati per il tempo necessario alle finalita del servizio. In caso di cessazione del rapporto,
            i dati vengono mantenuti per un massimo di 30 giorni salvo obblighi di legge diversi.
          </p>

          <h2>4. Destinatari e sub-responsabili</h2>
          <p>
            I dati possono essere trattati da fornitori tecnici nominati responsabili/sub-responsabili, tra cui Supabase
            (infrastruttura dati/auth), OpenAI (funzionalita AI), Stripe (pagamenti), oltre ad eventuali ulteriori
            fornitori strettamente necessari al funzionamento del servizio.
          </p>

          <h2>5. Trasferimenti extra SEE</h2>
          <p>
            Se necessari, avvengono nel rispetto del Capo V GDPR (es. decisioni di adeguatezza, clausole contrattuali
            standard e misure supplementari adeguate).
          </p>

          <h2>6. Diritti dell&apos;interessato</h2>
          <p>
            Gli interessati possono esercitare i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e
            portabilita, nonche proporre reclamo all&apos;Autorita Garante. Le richieste possono essere inviate a
            iamedassist@gmail.com.
          </p>

          <h2>7. Sicurezza</h2>
          <p>
            Sono adottate misure tecniche e organizzative adeguate al rischio, inclusi controlli di accesso, cifratura in
            transito, monitoraggio e backup.
          </p>

          <h2>7-bis. Conformita GDPR per studi medici</h2>
          <p>
            Per supportare l&apos;uso in ambito sanitario, il servizio include misure quali cifratura in transito,
            autenticazione, gestione dei permessi di accesso e registrazione di eventi tecnici (audit log operativi).
          </p>

          <h2>7-ter. Violazioni dei dati personali</h2>
          <p>
            In caso di data breach, il fornitore informa senza ingiustificato ritardo il cliente titolare e collabora per
            gli adempimenti di legge, inclusa l&apos;eventuale notifica all&apos;autorita entro 72 ore quando richiesta dal
            GDPR.
          </p>

          <h2>7-quater. Minori</h2>
          <p>
            Il servizio e destinato a utenti maggiorenni e professionisti. Non e destinato all&apos;uso diretto da parte
            di minori.
          </p>

          <h2>7-quinquies. Ambito territoriale</h2>
          <p>Il servizio e progettato principalmente per utilizzo in Italia e nell&apos;Unione Europea.</p>

          <h2>8. Aggiornamenti</h2>
          <p>
            La presente informativa puo essere aggiornata nel tempo. Le modifiche rilevanti saranno comunicate tramite i
            canali del servizio.
          </p>
        </div>
      </div>
    </main>
  )
}
