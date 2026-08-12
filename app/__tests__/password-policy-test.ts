import {
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  utf8ByteLength,
} from '../lib/password-policy';

describe('UTF-8 password policy', () => {
  test.each([
    ['', 0],
    ['ascii', 5],
    ['café', 5],
    ['中文', 6],
    ['😀', 4],
    ['a😀中', 8],
  ])('counts %p as %i UTF-8 bytes', (value, expected) => {
    expect(utf8ByteLength(value)).toBe(expected);
  });

  it('accepts exactly 72 UTF-8 bytes', () => {
    const password = `a1${'é'.repeat(35)}`;
    expect(utf8ByteLength(password)).toBe(MAX_PASSWORD_UTF8_BYTES);
    expect(comparablePasswordError(password)).toBeNull();
    expect(passwordPolicyError(password)).toBeNull();
  });

  it('rejects 73 UTF-8 bytes even when the JavaScript length is below 72', () => {
    const password = `a1${'é'.repeat(35)}b`;
    expect(password.length).toBeLessThan(MAX_PASSWORD_UTF8_BYTES);
    expect(utf8ByteLength(password)).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(passwordPolicyError(password)).toBe(
      'Password must be at most 72 UTF-8 bytes.',
    );
  });

  it('rejects short passwords and passwords missing a required character class', () => {
    expect(passwordPolicyError('abc123')).toBe(
      'Password must be at least 8 characters.',
    );
    expect(passwordPolicyError('abcdefgh')).toBe(
      'Password must include at least one letter and one number.',
    );
    expect(passwordPolicyError('12345678')).toBe(
      'Password must include at least one letter and one number.',
    );
  });

  it.each(['भाषा1234', 'భాషా1234', 'Español1']) (
    'accepts Unicode letters in %p',
    (password) => {
      expect(passwordPolicyError(password)).toBeNull();
    },
  );
});
