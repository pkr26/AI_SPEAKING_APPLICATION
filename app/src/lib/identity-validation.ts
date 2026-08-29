import { translate, type Translator } from './i18n';
import { MAX_EMAIL_LENGTH } from './password-policy';

// Deliberately mirrors the practical subset accepted by the API's zod email
// validator: one nonblank local part, a DNS-style domain, no whitespace or
// consecutive dots, and a final alphabetic domain of at least two characters.
// The API remains the authority; this prevents malformed forms from being sent.
const EMAIL_PATTERN =
  /^(?!.*\.\.)[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  const at = email.indexOf('@');
  if (at <= 0 || email.lastIndexOf('@') !== at || email[0] === '.' || email[at - 1] === '.') {
    return false;
  }
  return EMAIL_PATTERN.test(email);
}

/** No complaint for an untouched field; forms separately require nonempty. */
export function emailAddressError(value: string, t: Translator = translate): string | null {
  return value.trim().length > 0 && !isValidEmailAddress(value) ? t('email.invalid') : null;
}
