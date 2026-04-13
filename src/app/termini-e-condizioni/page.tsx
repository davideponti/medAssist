import Link from 'next/link'

export default function TerminiECondizioniPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary-700 hover:text-primary-900">
            Torna alla home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Termini e Condizioni - MedAssist AI</h1>
          <p className="text-sm text-gray-500 mt-2">Ultimo aggiornamento: 07/04/2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-gray-800">
          <p>
            I presenti Termini e Condizioni disciplinano l&apos;uso del servizio MedAssist AI, fornito da Davide
            Ponticorvo, Codice Fiscale PNTDVD06P21G568Y, con recapito in Via Montariello 8, Italia, contatto
            iamedassist@gmail.com.
          </p>

          <h2>1. Oggetto del servizio</h2>
          <p>
            MedAssist AI fornisce funzionalita software per supportare l&apos;attivita di studio medico (es. gestione
            documentale, supporto a trascrizione e bozze). Il servizio e uno strumento di supporto e non sostituisce il
            giudizio professionale sanitario.
          </p>

          <h2>2. Piano Professionale, prova gratuita e rinnovo</h2>
          <p>
            Il piano Professionale prevede canone di 49 EUR al mese, salvo diversa indicazione commerciale. E prevista
            una prova gratuita di 7 giorni impostata tramite Stripe Checkout. Alla scadenza della prova, in assenza di
            disdetta, l&apos;abbonamento si rinnova automaticamente con cadenza mensile.
          </p>

          <h2>3. Recesso, disdetta e rimborsi</h2>
          <p>
            L&apos;utente puo annullare l&apos;abbonamento in qualsiasi momento dal proprio account Stripe o tramite
            richiesta a iamedassist@gmail.com. In caso di disdetta, l&apos;accesso al piano a pagamento resta attivo fino
            al termine del periodo gia pagato o del periodo di prova in corso; successivamente il piano viene disattivato.
            Salvo obblighi di legge, gli importi gia addebitati non sono rimborsabili pro rata.
          </p>

          <h2>4. Pagamenti e fatturazione</h2>
          <p>
            I pagamenti sono elaborati da Stripe. MedAssist AI non memorizza i numeri completi delle carte di pagamento.
            L&apos;utente e responsabile della correttezza dei dati di fatturazione e del metodo di pagamento. Se dovuta,
            la documentazione fiscale (fattura o ricevuta) viene emessa in base al regime fiscale applicabile. Il prezzo
            di 49 EUR/mese e da intendersi IVA esclusa, salvo diversa indicazione esplicita.
          </p>

          <h2>5. Uso consentito</h2>
          <p>
            L&apos;utente si impegna a usare il servizio in conformita a legge, deontologia professionale e obblighi
            privacy applicabili. E vietato ogni uso illecito, fraudolento o in violazione di diritti di terzi.
          </p>

          <h2>6. Limiti d&apos;uso in ambito medico</h2>
          <p>
            MedAssist AI non effettua diagnosi medica e non puo essere usato per decisioni cliniche autonome. L&apos;utente
            resta l&apos;unico responsabile delle decisioni cliniche e delle comunicazioni verso i pazienti. Qualsiasi
            output generato deve essere verificato e approvato da un professionista sanitario prima dell&apos;uso.
          </p>

          <h2>7. Disponibilita del servizio (SLA)</h2>
          <p>
            Il servizio e fornito &quot;cosi com&apos;e&quot; e &quot;come disponibile&quot;. Non e garantita la continuita
            assoluta del servizio, che puo subire interruzioni per manutenzione, aggiornamenti o cause non dipendenti dal
            fornitore.
          </p>

          <h2>8. Limitazione di responsabilita</h2>
          <p>
            Nei limiti consentiti dalla legge, il fornitore non risponde di danni indiretti o conseguenti derivanti da
            uso improprio del servizio, indisponibilita temporanee di terze parti o inserimento di dati inesatti da parte
            dell&apos;utente.
          </p>

          <h2>9. Sospensione o cessazione</h2>
          <p>
            In caso di violazione dei presenti Termini, il servizio puo essere sospeso o risolto. Alla cessazione, i dati
            sono trattati secondo Privacy Policy e DPA applicabili.
          </p>

          <h2>10. Utenti ammessi e ambito territoriale</h2>
          <p>
            Il servizio e riservato a maggiorenni e professionisti/strutture sanitarie. MedAssist AI e progettato per uso
            in Italia e nell&apos;Unione Europea.
          </p>

          <h2>11. Modifiche ai Termini</h2>
          <p>
            I Termini possono essere aggiornati per esigenze normative, tecniche o commerciali. Le modifiche sostanziali
            saranno comunicate con ragionevole preavviso.
          </p>

          <h2>12. Legge applicabile e foro</h2>
          <p>
            Legge applicabile: italiana. Foro competente: Napoli, salvo diversa previsione inderogabile di legge.
          </p>
        </div>
      </div>
    </main>
  )
}
