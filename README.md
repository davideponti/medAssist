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
- **Supabase** (`@supabase/supabase-js`): Auth + tabella `doctors`
- **OpenAI** (SDK ufficiale): Whisper, chat completions (es. `gpt-4o`)
- **Stripe** (`stripe`): Checkout per abbonamento al piano Professionale (prova 7 giorni + canone mensile)
- **lucide-react** (icone)

---

## Requisiti

- **Node.js** 18+ (consigliato 20 LTS)
- Account **Supabase** (progetto con Auth email/password abilitato)
- Chiave **OpenAI** con accesso ai modelli usati dall’app

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

| Variabile | Obbligatoria | Ruolo |
|-----------|--------------|--------|
| `OPENAI_API_KEY` | Sì (per AI / trascrizioni) | Chiamate OpenAI lato server |
| `NEXT_PUBLIC_SUPABASE_URL` | Sì | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sì | Chiave anon (client e alcune route) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sì (signup, profilo server, documenti con profilo) | Operazioni server-side (es. `auth.admin`, bypass RLS dove serve) |
| `NEXT_PUBLIC_APP_URL` | Opzionale | URL pubblico dell’app se usato altrove |
| `STRIPE_SECRET_KEY` | Sì (piano Professionale / Checkout) | Chiave segreta Stripe (solo server); non usare `NEXT_PUBLIC_` |
| `STRIPE_PRICE_PROFESSIONAL` | Sì (Checkout) | ID del **prezzo ricorrente** mensile in Stripe (es. `price_...` per 49 €) |
| `STRIPE_WEBHOOK_SECRET` | Opzionale | Verifica firma per `POST /api/stripe/webhook` (eventi Stripe) |

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

## Note legali e deontologiche

- L’app è uno **strumento di supporto**: output generati dall’AI vanno **sempre verificati** dal medico.
- L’app **non genera prescrizioni** né ricette elettroniche. I documenti testuali prodotti **non sostituiscono** i sistemi ufficiali (ricetta elettronica, NRE, fascicolo sanitario, ecc.).
- Il titolare del trattamento dati sanitari e le finalità del trattamento restano responsabilità dello **studio** e devono rispettare GDPR e normativa professionale.

---

## Licenza e contributi

Progetto privato (`"private": true` in `package.json`). Per estensioni (es. export FHIR, multi-studio) pianificare architettura e conformità separatamente.
