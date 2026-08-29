import { translate, type Translator } from './i18n';
import { MAX_EMAIL_LENGTH } from './password-policy';

// Byte-for-byte equivalent to the email regex used by the installed server
// Zod 3.25.x validator. Keep this pinned to server/package-lock.json upgrades:
// accepting a stricter "practical" subset can lock an existing learner out,
// while accepting a broader subset makes signup/reset fail only after a POST.
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_PATTERN.test(email);
}

/** No complaint for an untouched field; forms separately require nonempty. */
export function emailAddressError(value: string, t: Translator = translate): string | null {
  return value.trim().length > 0 && !isValidEmailAddress(value) ? t('email.invalid') : null;
}
