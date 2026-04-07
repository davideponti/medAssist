/** Criteri password: almeno 8 caratteri, almeno un numero, almeno un simbolo speciale. */

const HAS_DIGIT = /\d/
/** Simboli consentiti (non lettera né cifra ASCII); evita spazi. */
const HAS_SPECIAL = /[^A-Za-z0-9\s]/

export const PASSWORD_HINT_IT =
  'Almeno 8 caratteri, un numero e un simbolo (es. ! @ # $ % & * ? - _ .).'

export function validatePasswordStrength(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 8) {
    return { ok: false, error: 'La password deve contenere almeno 8 caratteri.' }
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
  return { ok: true }
}
