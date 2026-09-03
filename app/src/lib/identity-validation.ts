import { translate, type Translator } from './i18n';
import { MAX_EMAIL_LENGTH } from './password-policy';

// Byte-for-byte equivalent to the email regex used by the installed server
// Zod 3.25.x validator. Keep this pinned to server/package-lock.json upgrades:
// accepting a stricter "practical" subset can lock an existing learner out,
// while accepting a broader subset makes signup/reset fail only after a POST.
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

/**
 * Accepts exactly the emails the server's Zod validator accepts: the pinned
 * regex plus the shared length bound, applied after one trim. Drift in either
 * direction is a compatibility break — stricter locks out an existing learner,
 * looser defers the rejection to a failed POST.
 */
export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_PATTERN.test(email);
}

/** No complaint for an untouched field; forms separately require nonempty. */
export function emailAddressError(value: string, t: Translator = translate): string | null {
  return value.trim().length > 0 && !isValidEmailAddress(value) ? t('email.invalid') : null;
}

/**
 * Mirrors the server's `nameSchema` control-character refinement
 * (server/src/auth.ts): every Unicode control, line-separator, and
 * paragraph-separator code point is refused so a pasted name cannot pass the
 * client gate and then fail with only the generic VALIDATION_FAILED copy.
 * Blank and over-length names stay gated by the existing per-form rules.
 */
export function hasNoControlCharacters(value: string): boolean {
  return !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value);
}

/** No complaint for an untouched field; forms separately require nonempty. */
export function nameError(value: string, t: Translator = translate): string | null {
  return value.length > 0 && !hasNoControlCharacters(value) ? t('name.invalid') : null;
}
