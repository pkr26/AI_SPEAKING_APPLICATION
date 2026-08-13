import {
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  utf8ByteLength,
} from '../src/lib/password-policy';

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
    expect(passwordPolicyError(password)).toBe('Password must be at most 72 UTF-8 bytes.');
  });

  it('rejects 73 bytes when a three-byte scalar precedes an unpaired low surrogate', () => {
    const password = `a1${'é'.repeat(32)}\u0800\udc00b`;

    expect(new TextEncoder().encode(password).byteLength).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(utf8ByteLength(password)).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(comparablePasswordError(password)).toBe('Password must be at most 72 UTF-8 bytes.');
    expect(passwordPolicyError(password)).toBe('Password must be at most 72 UTF-8 bytes.');
  });

  it('rejects 73 bytes across a low-high malformed surrogate boundary', () => {
    const password = `a1${'é'.repeat(31)}\udc00\ud800中`;

    expect(new TextEncoder().encode(password).byteLength).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(utf8ByteLength(password)).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(comparablePasswordError(password)).toBe('Password must be at most 72 UTF-8 bytes.');
    expect(passwordPolicyError(password)).toBe('Password must be at most 72 UTF-8 bytes.');
  });

  it('rejects short passwords and passwords missing a required character class', () => {
    expect(passwordPolicyError('abc123')).toBe('Password must be at least 8 characters.');
    expect(passwordPolicyError('abcdefgh')).toBe(
      'Password must include at least one letter and one number.',
    );
    expect(passwordPolicyError('12345678')).toBe(
      'Password must include at least one letter and one number.',
    );
  });

  it.each(['भाषा1234', 'భాషా1234', 'Español1'])('accepts Unicode letters in %p', (password) => {
    expect(passwordPolicyError(password)).toBeNull();
  });

  it.each([
    ['\x7F', 1],
    ['\u0080', 2],
    ['\u07FF', 2],
    ['\u0800', 3],
    ['\uD800', 3],
    ['\uDC00', 3],
    ['ab\uD800', 5],
    ['\uD800A', 4],
    ['\uD800\uD800', 6],
    ['\uD800\uDC00', 4],
  ])('counts boundary string %p as %i UTF-8 bytes', (value, expected) => {
    expect(utf8ByteLength(value)).toBe(expected);
  });

  it.each([
    '\u007f',
    '\u0080',
    '\u07ff',
    '\u0800',
    '\ud7ff',
    '\ud800',
    '\udbff',
    '\udc00',
    '\udfff',
    '\ue000',
    '\uffff',
    '\ud800\udc00',
    '\udbff\udfff',
    '\ud800\udbff',
    '\ud800\ue000',
    '\udfff\ud800',
    'a\ud800b\udc00c\udbff\udfff',
  ])('matches the platform UTF-8 encoder for boundary and malformed input %p', (value) => {
    expect(utf8ByteLength(value)).toBe(new TextEncoder().encode(value).byteLength);
  });

  it.each([
    {
      kind: 'repeated unpaired high surrogates',
      exact: `a1${'\ud800'.repeat(23)}b`,
    },
    {
      kind: 'repeated unpaired low surrogates',
      exact: `a1${'\udc00'.repeat(23)}b`,
    },
    {
      kind: 'valid astral surrogate pairs',
      exact: `a1${'😀'.repeat(17)}bc`,
    },
  ])('enforces the 72-byte boundary for $kind', ({ exact }) => {
    const overLimit = `${exact}c`;

    expect(utf8ByteLength(exact)).toBe(MAX_PASSWORD_UTF8_BYTES);
    expect(utf8ByteLength(overLimit)).toBe(MAX_PASSWORD_UTF8_BYTES + 1);
    expect(utf8ByteLength(exact)).toBe(new TextEncoder().encode(exact).byteLength);
    expect(utf8ByteLength(overLimit)).toBe(new TextEncoder().encode(overLimit).byteLength);
    expect(comparablePasswordError(exact)).toBeNull();
    expect(passwordPolicyError(exact)).toBeNull();
    expect(comparablePasswordError(overLimit)).toBe('Password must be at most 72 UTF-8 bytes.');
    expect(passwordPolicyError(overLimit)).toBe('Password must be at most 72 UTF-8 bytes.');
  });

  it('accepts exactly eight characters when the required classes are present', () => {
    expect(passwordPolicyError('abcdef1')).toBe('Password must be at least 8 characters.');
    expect(passwordPolicyError('abcdefg1')).toBeNull();
  });
});
