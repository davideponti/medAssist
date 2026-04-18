/**
 * Pseudonimizzazione di dati personali (PII) prima dell'invio a servizi AI.
 *
 * Strategia: sostituisce i dati identificativi con placeholder ([PAZIENTE_X])
 * prima di inviare a Azure OpenAI, poi ripristina i valori originali
 * nella risposta. Conforme GDPR art. 4(5) - pseudonimizzazione.
 *
 * Protegge i dati anche se il monitoraggio Azure non fosse disabilitato.
 */

export type PIIMap = Record<string, string>

/** Esegue l'escape di caratteri speciali regex */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Pattern regex per PII italiane comuni */
const CF_REGEX = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi
const PHONE_REGEX = /\b(?:\+?39[\s.-]?)?(?:3\d{2}|0\d{1,3})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
const DATE_REGEX = /\b(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](19|20)\d{2}\b/g

/**
 * Pseudonimizza un testo rimpiazzando PII con placeholder.
 * Ritorna { anonymized, map } dove `map` permette la ricostruzione.
 */
export function anonymizeText(
  text: string,
  knownNames: string[] = [],
  prefix = ''
): { anonymized: string; map: PIIMap } {
  const map: PIIMap = {}
  let result = text

  // 1. Rimpiazza i nomi noti (più specifici) per primi
  knownNames
    .filter((n) => n && n.trim().length >= 2)
    .sort((a, b) => b.length - a.length) // più lunghi prima
    .forEach((name, idx) => {
      const placeholder = `[${prefix}PAZIENTE_${idx}]`
      const regex = new RegExp(escapeRegExp(name.trim()), 'gi')
      if (regex.test(result)) {
        result = result.replace(regex, placeholder)
        map[placeholder] = name.trim()
      }
    })

  // 2. Codici fiscali
  let cfIdx = 0
  result = result.replace(CF_REGEX, (m) => {
    const ph = `[${prefix}CF_${cfIdx++}]`
    map[ph] = m
    return ph
  })

  // 3. Email
  let emailIdx = 0
  result = result.replace(EMAIL_REGEX, (m) => {
    const ph = `[${prefix}EMAIL_${emailIdx++}]`
    map[ph] = m
    return ph
  })

  // 4. Numeri di telefono
  let phoneIdx = 0
  result = result.replace(PHONE_REGEX, (m) => {
    const ph = `[${prefix}TEL_${phoneIdx++}]`
    map[ph] = m
    return ph
  })

  // 5. Date di nascita (formato dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy)
  let dateIdx = 0
  result = result.replace(DATE_REGEX, (m) => {
    const ph = `[${prefix}DATA_${dateIdx++}]`
    map[ph] = m
    return ph
  })

  return { anonymized: result, map }
}

/** Ripristina i valori originali in un testo pseudonimizzato. */
export function deanonymizeText(text: string, map: PIIMap): string {
  let result = text
  // Ordine: chiavi più lunghe prima per evitare collisioni
  const keys = Object.keys(map).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const regex = new RegExp(escapeRegExp(key), 'g')
    result = result.replace(regex, map[key])
  }
  return result
}

/** Unisce più mappe PII. */
export function mergeMaps(...maps: PIIMap[]): PIIMap {
  return Object.assign({}, ...maps)
}
