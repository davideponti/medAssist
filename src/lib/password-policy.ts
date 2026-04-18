/** Criteri password: almeno 8 caratteri, almeno un numero, almeno un simbolo speciale. */

const HAS_DIGIT = /\d/
/** Simboli consentiti (non lettera né cifra ASCII); evita spazi. */
const HAS_SPECIAL = /[^A-Za-z0-9\s]/

/**
 * Blocklist di password comuni/deboli.
 * Include pattern tipici che passerebbero i requisiti base ma sono nel top
 * delle liste di attacco (rockyou, haveibeenpwned).
 */
const COMMON_PASSWORD_PATTERNS = [
  /^password\d*!?$/i,
  /^passw[o0]rd\d*[!@#$]?$/i,
  /^admin\d*!?$/i,
  /^qwerty\d*!?$/i,
  /^letmein\d*!?$/i,
  /^welcome\d*!?$/i,
  /^dottore?\d*!?$/i,
  /^medic[oa]\d*!?$/i,
  /^12345/,
  /^abc123/i,
  /^changeme\d*!?$/i,
]

const COMMON_PASSWORDS_EXACT = new Set([
  'password', 'password1', 'password1!', 'password123', 'password123!',
  'admin', 'admin123', 'admin123!', 'administrator',
  'qwerty', 'qwerty1!', 'qwerty123',
  '12345678', '123456789', '1234567890',
  'welcome1', 'welcome1!', 'welcome123',
  'iloveyou1', 'iloveyou!', 'iloveyou1!',
  'letmein1', 'letmein1!',
  'monkey1!', 'dragon1!', 'master1!',
  'dottore1!', 'dottore123', 'medico1!', 'medico123',
  'changeme1', 'changeme1!',
])

export const PASSWORD_HINT_IT =
  'Almeno 8 caratteri, un numero e un simbolo (es. ! @ # $ % & * ? - _ .). Evita password comuni.'

export function validatePasswordStrength(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 8) {
    return { ok: false, error: 'La password deve contenere almeno 8 caratteri.' }
  }
  if (password.length > 200) {
    return { ok: false, error: 'La password è troppo lunga (max 200 caratteri).' }
  }
  if (!HAS_DIGIT.test(password)) {
    return { ok: false, error: 'La password deve contenere almeno un numero.' }
  }
  if (!HAS_SPECIAL.test(password)) {
    return {
      ok: false,
      error: 'La password deve contenere almeno un simbolo speciale (es. ! @ # $ % & *).',
    }
  }

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS_EXACT.has(lower)) {
    return { ok: false, error: 'Questa password è troppo comune. Sceglie una password meno prevedibile.' }
  }
  for (const re of COMMON_PASSWORD_PATTERNS) {
    if (re.test(password)) {
      return {
        ok: false,
        error: 'Questa password segue un pattern troppo comune. Scegli una password meno prevedibile.',
      }
    }
  }

  // Almeno 5 caratteri unici per evitare "aaaaaaa1!" o simili
  const uniqueChars = new Set(password).size
  if (uniqueChars < 5) {
    return {
      ok: false,
      error: 'La password contiene troppi caratteri ripetuti. Usa più varietà.',
    }
  }

  return { ok: true }
}
