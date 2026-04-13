# Configurazione Google OAuth per MedAssist AI

## 1. Configurazione Google Cloud Console

1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita "Google+ API" o "People API"
4. Vai a "Credentials" → "Create Credentials" → "OAuth client ID"
5. Seleziona "Web application"
6. Aggiungi i seguenti URI autorizzati:
   - Produzione: `https://tuodominio.com/auth/callback`
   - Sviluppo: `http://localhost:3000/auth/callback`
7. Salva il Client ID e Client Secret

## 2. Configurazione Supabase

1. Vai a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai a "Authentication" → "Providers"
4. Abilita "Google"
5. Inserisci il Client ID e Client Secret da Google Cloud Console
6. Imposta il Redirect URL: `https://[project-id].supabase.co/auth/v1/callback`
7. Salva la configurazione

## 3. Variabili Environment

Aggiungi al tuo `.env.local`:

```env
# Google OAuth (opzionale - se vuoi login con Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

## 4. Callback URL nel Google Cloud Console

Assicurati che il callback URL sia configurato correttamente:
- Produzione: `https://[project-id].supabase.co/auth/v1/callback`
- Sviluppo: `http://localhost:3000/auth/callback`

## Note importanti

- Il redirect URL in Supabase DEVE corrispondere a quello configurato in Google Cloud Console
- Per ambiente di sviluppo, puoi usare `http://localhost:3000/auth/callback`
- Per produzione, usa il tuo dominio reale
- L'abilitazione di Google OAuth richiede un dominio verificato in produzione
