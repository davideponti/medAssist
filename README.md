# MedAssist AI

Applicazione web per studi medici che combina **Next.js 14**, **Supabase** (autenticazione e profilo medico) e **OpenAI** (trascrizione, note cliniche SOAP, documenti, bozze risposte messaggi). Interfaccia e contenuti orientati al contesto **italiano**.

---

## Indice

- [Funzionalità](#funzionalità)
- [Stack tecnologico](#stack-tecnologico)
- [Requisiti](#requisiti)
- [Installazione e avvio](#installazione-e-avvio)
- [Variabili d’ambiente](#variabili-dambiente)
- [Database Supabase](#database-supabase)
- [API REST (route interne)](#api-rest-route-interne)
- [Struttura del progetto](#struttura-del-progetto)
- [Autenticazione e sessione](#autenticazione-e-sessione)
- [Sicurezza](#sicurezza)
- [Note legali e deontologiche](#note-legali-e-deontologiche)

---

## Funzionalità

### Pagina pubblica (`/`)

- Presentazione del prodotto (MedAssist AI).
- Collegamenti a **Accedi** (`/login`), **Registrati** (`/signup`) e **Inizia Gratis** (dashboard).

### Account e profilo medico

| Funzione | Descrizione |
|----------|-------------|
| **Registrazione** (`/signup`) | Email, password, dati medico (nome, specializzazione, studio opzionale, indirizzo, telefono). Crea utente Supabase Auth e riga in `public.doctors`. |
| **Login** (`/login`) | Accesso con email e password; sessione in cookie httpOnly. |
| **Logout** | Dalla sidebar: chiusura sessione locale e redirect a `/login`. |
| **Profilo / Impostazioni** (`/dashboard/settings`) | Modifica nome, email, telefono, specializzazione, **iscrizione Albo (OMceo)**, **codice fiscale medico**, nome studio, indirizzo. Salvataggio su Supabase via API. |
| **Sicurezza** | Cambio password (password attuale + nuova) tramite API dedicata. |

### Dashboard (`/dashboard`)

- Saluto personalizzato con **nome medico** dal profilo.
- Schede riepilogative e liste di esempio (visite, inbox): dati **dimostrativi**, non collegati a un database pazienti.

### Visite

| Percorso | Descrizione |
|----------|-------------|
| **`/dashboard/visits`** | Elenco visite salvate in **localStorage** (dopo elaborazione da Nuova visita); modale «Leggi visita completa» con trascrizione e SOAP. |
| **`/dashboard/visits/new`** | Consenso alla trascrizione obbligatorio; **registrazione audio**, **`/api/transcribe`**, nota SOAP; salvataggio automatico in elenco visite. |

### Documenti (`/dashboard/documents`)

- Tipi: **Referral**, **Lettera**, **Certificato** (nessuna generazione di prescrizioni farmacologiche o ricette).
- Generazione via **`/api/documents`** + OpenAI; ogni output viene salvato in **archivio locale** (tre sezioni: lettere, certificati, referral).
- **Intestazione** da profilo (cookie sessione): studio, medico, contatti, Albo, CF medico.
- Ricerca dall’header e nell’archivio.

### Inbox pazienti (`/dashboard/inbox`)

- I pazienti scrivono dalla pagina pubblica **`/c/[doctorId]`** (link condivisibile da Impostazioni / Inbox); messaggi in tabella **`patient_messages`** (Supabase).
- **Risposta manuale** (salvataggio) e bozza **AI** via **`/api/inbox`**.

### Pazienti (`/dashboard/patients`)

- Anagrafica in tabella Supabase **`patients`** (RLS: ogni medico vede solo i propri pazienti). Creazione da modale **Nuovo paziente**; ricerca in pagina e dall’header.

### Impostazioni

- Vedi sopra: profilo completo, notifiche (checkbox UI, senza persistenza backend), sicurezza.

---

## Stack tecnologico

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS**
- **Supabase** (`@supabase/supabase-js`): Auth + tabella `doctors` (regione UE per GDPR)
- **Azure OpenAI** (SDK `openai` con `AzureOpenAI`): Whisper + gpt-4o in regione EU (Sweden Central) per conformità GDPR. Fallback su OpenAI standard se `AZURE_OPENAI_*` non è configurato.
- **Stripe** (`stripe`): Checkout per abbonamento al piano Professionale (prova 7 giorni + canone mensile)
- **lucide-react** (icone)

---

## Requisiti

- **Node.js** 18+ (consigliato 20 LTS)
- Account **Supabase** (progetto con Auth email/password abilitato, regione UE)
- **Azure OpenAI** con deployment `gpt-4o` e `whisper` in regione EU (consigliato per GDPR) **oppure** chiave **OpenAI** standard come fallback

---

## Installazione e avvio

```bash
npm install
cp .env.local.example .env.local
# Modifica .env.local con le tue chiavi
```

Configura il database (vedi sezione [Database Supabase](#database-supabase)), poi:

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Altri comandi:

| Comando | Uso |
|---------|-----|
| `npm run dev` | Sviluppo |
| `npm run build` | Build di produzione |
| `npm run start` | Avvio dopo build |
| `npm run lint` | ESLint |

---

## Variabili d’ambiente

Crea `.env.local` (non committare). Esempio in `.env.local.example`:

### AI — Azure OpenAI (consigliato, GDPR) oppure OpenAI

Il codice usa **Azure OpenAI** se sono presenti le variabili `AZURE_OPENAI_*`, altrimenti ripiega su `OPENAI_API_KEY`.

| Variabile | Obbligatoria | Ruolo |
|-----------|--------------|--------|
| `AZURE_OPENAI_ENDPOINT` | Sì (GDPR) | Endpoint risorsa Azure AI Foundry (es. `https://medincly1.services.ai.azure.com/`) |
| `AZURE_OPENAI_KEY` | Sì (GDPR) | KEY 1 della risorsa Azure OpenAI |
| `AZURE_OPENAI_DEPLOYMENT_GPT4O` | Sì | Nome del deployment del modello chat (es. `gpt-4o`) |
| `AZURE_OPENAI_DEPLOYMENT_WHISPER` | Sì (trascrizioni) | Nome del deployment Whisper (es. `whisper`) |
| `AZURE_OPENAI_API_VERSION` | Opzionale | Default `2024-10-21` |
| `OPENAI_API_KEY` | Fallback | Usata solo se le variabili Azure non sono configurate |

### Altre variabili

| Variabile | Obbligatoria | Ruolo |
|-----------|--------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sì | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sì | Chiave anon (client e alcune route) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sì (signup, profilo server, documenti con profilo) | Operazioni server-side (es. `auth.admin`, bypass RLS dove serve) |
| `NEXT_PUBLIC_APP_URL` | Opzionale | URL pubblico dell'app se usato altrove |
| `STRIPE_SECRET_KEY` | Sì (piano Professionale / Checkout) | Chiave segreta Stripe (solo server); non usare `NEXT_PUBLIC_` |
| `STRIPE_PRICE_PROFESSIONAL` | Sì (Checkout) | ID del **prezzo ricorrente** mensile in Stripe (es. `price_...` per 49 €) |
| `STRIPE_WEBHOOK_SECRET` | Opzionale | Verifica firma per `POST /api/stripe/webhook` (eventi Stripe) |
| `REDIS_URL` | Opzionale | Rate limiting persistente (altrimenti fallback in-memory) |

Dopo ogni modifica a `.env.local` in sviluppo, **riavvia** `npm run dev`.

---

## Database Supabase

### Tabella `public.doctors`

Profilo medico legato a `auth.users.id` (stesso UUID come chiave primaria).

Esegui gli script SQL nell’ordine (o unifica manualmente) dalla cartella `supabase/migrations/`:

1. **`001_doctors_table.sql`** — crea tabella, indice email univoca, RLS, policy `SELECT`/`UPDATE` per utente autenticato sul proprio record.
2. **`002_doctors_albo_registration.sql`** — colonna `albo_registration`.
3. **`003_doctors_fiscal_ricetta.sql`** — colonna `fiscal_code` (se non già inclusa in `001`).
4. **`004_patient_messages.sql`** — messaggi pazienti (pagina pubblica `/c/[doctorId]`, inbox medico).
5. **`005_patients.sql`** — anagrafica pazienti dello studio (`doctor_id` → `doctors`).

Se la tabella esiste già senza alcune colonne, esegui solo gli `ALTER` dei file necessari.

La **registrazione** (`/api/auth/signup`) inserisce la riga in `doctors` con la **service role**; in produzione proteggi la service role e non esporla al client.

---

## API REST (route interne)

Tutte sotto `src/app/api/…`.

| Metodo | Percorso | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Crea utente + profilo `doctors` (service role). |
| `POST` | `/api/auth/login` | Login; imposta cookie httpOnly di sessione; ritorna user, doctor (senza token nel JSON). |
| `POST` | `/api/auth/logout` | Cancella il cookie di sessione. |
| `POST` | `/api/auth/forgot-password` | Invio email reset password Supabase (`redirectTo` → `/auth/reimposta-password`). |
| `GET` | `/api/auth/me` | Utente + doctor (sessione da cookie httpOnly). |
| `POST` | `/api/auth/change-password` | Cambio password (verifica password attuale + aggiornamento). |
| `GET` / `PUT` | `/api/doctor/profile` | Lettura / aggiornamento profilo `doctors` (cookie sessione). |
| `GET` / `POST` | `/api/patients` | Lista / creazione pazienti (tabella `patients`, cookie). |
| `POST` | `/api/documents` | Genera documento; intestazione da profilo se cookie sessione presente. |
| `POST` | `/api/transcribe` | Audio → testo (Whisper) + opzioni note cliniche. |
| `POST` | `/api/inbox` | Genera bozza risposta + azione suggerita (OpenAI). |
| `GET` | `/api/inbox/messages` | Lista messaggi pazienti del medico (cookie). |
| `PATCH` | `/api/inbox/messages/[id]` | Aggiorna `doctor_reply`, bozza AI, `read_at`. |
| `GET` | `/api/inbox/unread-count` | Conteggio messaggi non letti (campanella). |
| `POST` | `/api/public/contact` | Invio messaggio da pagina pubblica (service role insert). |
| `POST` | `/api/stripe/checkout` | Crea sessione Stripe Checkout (abbonamento + prova 7 giorni) e restituisce l’URL. |
| `POST` | `/api/stripe/webhook` | Riceve eventi Stripe (richiede `STRIPE_WEBHOOK_SECRET`); altrimenti risponde 503. |

Pagina pubblica: **`/c/[doctorId]`** (UUID medico = `auth.users.id`).

---

## Struttura del progetto

```
src/
  app/                 # App Router: page, layout, API routes
  components/          # UI (Button, Card, Input, layout Sidebar/Header, Providers)
  contexts/            # AuthContext (user, doctor, login, signup, logout, updateProfile)
  lib/                 # openai.ts, supabase user/admin (solo server), auth cookie/session, utils
  middleware.ts        # Protezione /dashboard e redirect se già loggato su /login e /signup
supabase/migrations/   # Script SQL per doctors
```

---

## Autenticazione e sessione

- `AuthProvider` avvolge l’app in `src/components/Providers.tsx` (usato dal root `layout.tsx`).
- Il JWT di accesso Supabase è in un **cookie httpOnly** (`medassist_session`), impostato al login e rimosso al logout — non è esposto a JavaScript nel browser.
- Le `fetch` verso le API usano `credentials: 'include'` per inviare il cookie.
- **`middleware.ts`**: senza cookie di sessione non si accede a `/dashboard/*`; con sessione valida si viene reindirizzati da `/login` e `/signup` alla dashboard.
- **Password:** almeno 8 caratteri, almeno un numero e un simbolo (vedi `src/lib/password-policy.ts`). **Recupero password:** `/recupera-password` → email Supabase; in **Supabase Dashboard → Authentication → URL Configuration** aggiungi tra i redirect consentiti `http://localhost:3000/auth/reimposta-password` e l’URL di produzione equivalente.

**Service role:** `SUPABASE_SERVICE_ROLE_KEY` è usata solo in route handler server-side (`getSupabaseAdmin` in `src/lib/supabase-admin.ts`, con `server-only`). Non deve mai essere prefissata con `NEXT_PUBLIC_` né importata da componenti client.

---

## Sicurezza

### 1. Cookie e Sessione

| Caratteristica | Implementazione |
|----------------|-----------------|
| **Cookie httpOnly** | Il token JWT non è accessibile via JavaScript (`medassist_session`) |
| **Secure** | Cookie marcato `Secure` in produzione (HTTPS) |
| **SameSite** | `Lax` per prevenire CSRF cross-site |
| **Max-Age** | 7 giorni di durata della sessione |
| **Logout** | Cancellazione cookie lato server con path `/` |

### 2. Protezione API

- **Rate limiting**: implementato su endpoint sensibili (login, checkout Stripe) con `lib/api-security.ts`
- **Origin validation**: verifica `Referer`/`Origin` su API critiche
- **Input validation**: sanitizzazione input con validazione tipo Zod
- **Error handling**: messaggi generici in produzione, log dettagliati solo server-side

### 3. Row Level Security (RLS) Supabase

Tutte le tabelle dati hanno RLS attivo:

```sql
-- Esempio: ogni medico vede solo i propri dati
CREATE POLICY "Medici vedono solo i propri record"
ON doctors FOR SELECT
USING (auth.uid() = id);
```

| Tabella | Policy |
|---------|--------|
| `doctors` | Utente vede/modifica solo il proprio record (`id = auth.uid()`) |
| `patients` | `doctor_id` collegato al medico autenticato |
| `patient_messages` | Lettura solo per il medico destinatario (`doctor_id`) |

### 4. Gestione Chiavi API

| Chiave | Dove | Protezione |
|--------|------|------------|
| `OPENAI_API_KEY` | Server routes only | Non esposta al client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server routes only | `server-only` import, mai `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | Server routes only | Non committare, `.env.local` |
| `NEXT_PUBLIC_*` | Client | Solo chiavi pubbliche (anon key, URL Supabase) |

**Regole d'oro:**
- ❌ Mai prefissare chiavi server con `NEXT_PUBLIC_`
- ❌ Mai importare `SUPABASE_SERVICE_ROLE_KEY` in componenti client
- ✅ Usare `server-only` per moduli server-side

### 5. Sicurezza Stripe

- **Webhook signature**: verifica `STRIPE_WEBHOOK_SECRET` su ogni evento Stripe
- **Idempotenza**: le operazioni di checkout sono atomiche
- **Customer isolation**: ogni medico ha il proprio `stripe_customer_id`
- **No dati sensibili**: non salviamo carte di credito (gestite da Stripe)

### 6. Best Practices Produzione

```bash
# 1. HTTPS obbligatorio
# Configura SSL/TLS sul server di produzione

# 2. Header di sicurezza (next.config.js)
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }]
}

# 3. Dependency audit
npm audit
npm audit fix

# 4. Environment separation
# .env.local (dev) vs variabili deploy (produzione)
# Mai riutilizzare chiavi tra ambienti
```

### 7. GDPR, DPA e Privacy

#### Ruoli GDPR
- **Medico (studio)** = **Data Controller** (titolare del trattamento)
- **Piattaforma** = **Data Processor** (responsabile del trattamento)
- **Fornitori cloud** (Azure, Supabase, Stripe) = sub-processor

#### Dati e regioni di processing

| Dato | Fornitore | Regione | DPA |
|------|-----------|---------|-----|
| Autenticazione, profili medici, pazienti, messaggi | Supabase | UE (configurabile) | ✅ Disponibile, da accettare |
| Trascrizioni audio (Whisper) | **Azure OpenAI** | **Sweden Central (UE)** | ✅ Incluso con Azure |
| Note SOAP, documenti, risposte inbox (gpt-4o) | **Azure OpenAI** | **Sweden Central (UE)** | ✅ Incluso con Azure |
| Pagamenti/abbonamenti | Stripe | UE + globale | ✅ Incluso |

#### Caratteristiche

- **Dati sanitari**: classificati come dati di categoria speciale (art. 9 GDPR)
- **Pseudonimizzazione pre-AI** (`src/lib/anonymize.ts`): nomi pazienti, codici fiscali, email, telefoni e date sono sostituiti con placeholder (`[PAZIENTE_0]`, `[CF_0]`, ecc.) prima dell'invio ad Azure OpenAI. I valori vengono ripristinati nella risposta. Conforme GDPR art. 4(5).
- **Azure OpenAI**: nessun training sui dati del cliente, dati elaborati in regione UE
- **Monitoraggio abusi**: richiedere a Microsoft l'esenzione per dati sanitari tramite [aka.ms/oai/additionalusecases](https://aka.ms/oai/additionalusecases)
- **Consenso**: pagina contatto paziente richiede conferma esplicita
- **Retention**: i dati rimangono nel database del medico (data controller)
- **Breach notification**: sistema di log per tracciare accessi anomali
- **Nessuna prescrizione**: l'app non genera ricette elettroniche né sostituisce i sistemi ufficiali

#### Checklist produzione

- [ ] Accettare DPA Supabase (Dashboard → Settings)
- [ ] Verificare regione UE Supabase
- [ ] Azure OpenAI configurato in regione UE
- [ ] Richiesta esenzione monitoraggio abusi per Azure OpenAI
- [ ] Privacy policy pubblica con data mapping
- [ ] Termini di servizio con ruoli Data Controller/Processor
- [ ] Registro dei trattamenti (art. 30 GDPR)

---

## Note legali e deontologiche

- L’app è uno **strumento di supporto**: output generati dall’AI vanno **sempre verificati** dal medico.
- L’app **non genera prescrizioni** né ricette elettroniche. I documenti testuali prodotti **non sostituiscono** i sistemi ufficiali (ricetta elettronica, NRE, fascicolo sanitario, ecc.).
- Il titolare del trattamento dati sanitari e le finalità del trattamento restano responsabilità dello **studio** e devono rispettare GDPR e normativa professionale.
---

## Licenza e contributi

Progetto privato (`"private": true` in `package.json`). Per estensioni (es. export FHIR, multi-studio) pianificare architettura e conformità separatamente.
