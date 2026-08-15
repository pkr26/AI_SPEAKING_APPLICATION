import { translate, type Translator } from './i18n';

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PASSWORD_UTF8_BYTES = 72;

/** UTF-8 byte count matching Node's Buffer.byteLength for user-entered text. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export function comparablePasswordError(
  password: string,
  t: Translator = translate,
): string | null {
  if (utf8ByteLength(password) > MAX_PASSWORD_UTF8_BYTES) {
    return t('password.tooLong');
  }
  return null;
}

/** Client-side mirror of the server password policy. */
export function passwordPolicyError(password: string, t: Translator = translate): string | null {
  if (password.length < 8) {
    return t('password.tooShort');
  }
  if (!/\p{L}/u.test(password) || !/[0-9]/.test(password)) {
    return t('password.needsLetterAndNumber');
  }
  const byteError = comparablePasswordError(password, t);
  if (byteError) return byteError;
  return null;
}
