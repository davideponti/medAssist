import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY mancante: aggiungi la chiave in .env.local e riavvia il server di sviluppo.'
    )
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: key })
  }
  return openaiClient
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
  // Convert Buffer to Uint8Array for File API compatibility
  const uint8Array = new Uint8Array(audioBuffer)
  
  const response = await getOpenAI().audio.transcriptions.create({
    file: new File([uint8Array], 'audio.webm', { type: mimeType }),
    model: 'whisper-1',
    language: 'it',
  })

  return response.text
}

export async function generateClinicalNote(transcription: string, patientContext?: string): Promise<{
  subjective: string
  objective: string
  assessment: string
  plan: string
  summary: string
}> {
  const systemPrompt = `Sei un assistente medico specializzato nella creazione di note cliniche strutturate in formato SOAP.

Regole di accuratezza (obbligatorie):
- Non inventare mai informazioni cliniche (diagnosi, terapie/farmaci, dosi, esami, procedure, segni vitali, tempi) che non siano presenti nella trascrizione o nelle correzioni del medico.
- Se un dato non è presente nella trascrizione (e non è presente nelle correzioni), scrivi: "Non determinabile dalla trascrizione".
- Se una correzione del medico è presente, usala come riferimento per quella sezione. Se la correzione è esplicitamente "da confermare", indica tale incertezza nella sezione interessata (es. "Da confermare").

Definizioni SOAP:
- S (Soggettivo): sintesi di ciò che il paziente riferisce (es. dolore, sintomi, percezioni). Non includere saluti/conversazioni non cliniche.
- O (Obiettivo): solo ciò che è osservato e/o misurato dal medico o riportato come rilevato nell'esame obiettivo. Se la trascrizione non contiene segni vitali o reperti, scrivi: "Segni vitali e reperti obiettivi non disponibili in questa trascrizione".
- A (Valutazione): impressione clinica basata ESCLUSIVAMENTE su S/O (e sulle correzioni). Se mancano dati sufficienti, scrivi "Valutazione da confermare".
- P (Piano): cosa fare nel modo più concreto possibile, basandosi su ciò che è presente in trascrizione/correzioni; se mancano dettagli operativi, scrivi "Piano da definire/integrare dopo conferma clinica".
- Summary: 2-3 frasi neutre e sintetiche.

Rispondi SEMPRE in formato JSON con i seguenti campi:
- subjective: sintesi della storia del paziente, sintomi riferiti, anamnesi
- objective: esame obiettivo, segni vitali, reperti clinici
- assessment: diagnosi o impressione diagnostica
- plan: piano terapeutico, prescrizioni, follow-up
- summary: riassunto breve della visita (2-3 frasi)

Usa linguaggio medico professionale in italiano.`

  const userPrompt = `Trascrizione della visita:
${transcription}

${patientContext ? `Contesto paziente:\n${patientContext}` : ''}

Genera la nota clinica strutturata.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

/** Dati studio/medico da tabella doctors (profilo salvato in Impostazioni) */
export type DoctorLetterhead = {
  name: string
  email?: string | null
  phone?: string | null
  clinic?: string | null
  address?: string | null
  specialization?: string | null
  /** Iscrizione all'Ordine dei Medici (Italia) */
  albo_registration?: string | null
  /** Codice fiscale medico */
  fiscal_code?: string | null
}

function buildLetterheadBlock(doctor: DoctorLetterhead | null | undefined): string {
  if (!doctor) {
    return `INTESTAZIONE STUDIO/MEDICO
(Nessun profilo collegato: in testa al documento usa segnaposti [Studio], [Medico], [Indirizzo], [Telefono], [Email], [Iscrizione Albo OMceo], [CF medico].)`
  }

  const lines: string[] = [
    'INTESTAZIONE STUDIO/MEDICO (inserisci in testa al documento, testo fedele ai dati sotto):',
  ]
  const add = (label: string, value?: string | null) => {
    const t = value?.trim()
    if (t) lines.push(`${label}: ${t}`)
  }
  add('Studio', doctor.clinic)
  add('Medico', doctor.name)
  add('Specializzazione', doctor.specialization)
  add('Indirizzo', doctor.address)
  add('Telefono', doctor.phone)
  add('Email', doctor.email)
  const albo = doctor.albo_registration?.trim()
  if (albo) {
    lines.push(`Iscrizione Ordine Medici (Albo OMceo): ${albo}`)
  } else {
    lines.push(
      'Iscrizione Ordine Medici (Albo OMceo): [MANCANTE — obbligatoria in Italia: inserirla in Impostazioni profilo]'
    )
  }

  const cfMed = doctor.fiscal_code?.trim()
  if (cfMed) {
    lines.push(`Codice fiscale (medico): ${cfMed}`)
  } else {
    lines.push(
      'Codice fiscale (medico): [MANCANTE — obbligatorio per documenti clinici italiani: Impostazioni profilo]'
    )
  }

  return lines.join('\n')
}

type DocumentContext = {
  patientName: string
  patientInfo?: string
  clinicalNote?: string
  destination?: string
  additionalInfo?: string
}

export async function generateDocument(
  type: 'referral' | 'letter' | 'certificate',
  context: DocumentContext,
  doctor?: DoctorLetterhead | null
): Promise<string> {
  const letterhead = buildLetterheadBlock(doctor ?? null)

  const prompts = {
    referral: `Genera una lettera di referral/consulenza specialistica professionale.
Il paziente è: ${context.patientName}
${context.patientInfo ? `Info paziente: ${context.patientInfo}` : ''}
${context.clinicalNote ? `Nota clinica: ${context.clinicalNote}` : ''}
${context.destination ? `Specialista/Reparto destinatario: ${context.destination}` : ''}
${context.additionalInfo ? `Info aggiuntive: ${context.additionalInfo}` : ''}`,

    letter: `Genera una lettera formale per il paziente ${context.patientName}.
${context.destination ? `Destinatario: ${context.destination}` : ''}
Contesto: ${context.additionalInfo || 'Comunicazione generica'}
${context.clinicalNote ? `Riferimento visita: ${context.clinicalNote}` : ''}`,

    certificate: `Genera un certificato medico per ${context.patientName}.
${context.additionalInfo ? `Motivo: ${context.additionalInfo}` : ''}
${context.patientInfo ? `Info rilevanti: ${context.patientInfo}` : ''}`,
  }

  const userBody = `${letterhead}\n\n---\n\n${prompts[type]}`

  const systemDefault = `Sei un medico che redige documenti clinici formali in italiano.
L'intestazione dello studio/medico è già gestita esternamente nel documento: NON ripetere i dati del medico all'inizio del testo, ma usa il nome del medico per la firma in fondo.
Non generare prescrizioni farmacologiche, ricette o indicazioni terapeutiche sostitutive dei sistemi ufficiali: limitati a lettere di referral, certificati e comunicazioni come richiesto.
In fondo al documento aggiungi SEMPRE questo blocco finale, anche se non richiesto esplicitamente:
- "Giorni di assenza consigliati: [XX]"
- "Firma del medico: ____________________"
- "Timbro: ____________________"
Usa formato professionale con corpo e chiusura con firma riferita al medico indicato nell'intestazione quando presente.
Data odierna: ${new Date().toLocaleDateString('it-IT')}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemDefault },
      { role: 'user', content: userBody },
    ],
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''
  if (!text) {
    throw new Error('Il modello non ha restituito testo. Controlla la connessione e riprova.')
  }
  return text
}

export async function generatePatientResponse(
  message: string,
  patientContext?: string,
  previousContext?: string
): Promise<{ response: string; suggestedAction: string }> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Sei un assistente che aiuta a rispondere ai messaggi dei pazienti per uno studio medico.
Genera una risposta professionale, empatica e appropriata.
Rispondi in JSON con:
- response: la risposta da inviare al paziente
- suggestedAction: azione suggerita (es. "prenotare visita", "nessuna azione", "chiamare paziente")`,
      },
      {
        role: 'user',
        content: `Messaggio paziente: "${message}"
${patientContext ? `Contesto paziente: ${patientContext}` : ''}
${previousContext ? `Conversazione precedente: ${previousContext}` : ''}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content || '{"response":"", "suggestedAction":""}')
}
