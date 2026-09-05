import { firstParam, isUuid } from '../src/lib/params';
import { parsePendingAssessment } from '../src/lib/pending-assessment';

describe('route parameter helpers', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('uses the first repeated route parameter and preserves scalar values', () => {
    expect(firstParam(['first', 'second'])).toBe('first');
    expect(firstParam([])).toBeUndefined();
    expect(firstParam('single')).toBe('single');
    expect(firstParam(undefined)).toBeUndefined();
  });

  it.each([
    '550e8400-e29b-41d4-a716-446655440000',
    '550E8400-E29B-41D4-A716-446655440000',
    '00000000-0000-1000-8000-000000000000',
    'ffffffff-ffff-5fff-bfff-ffffffffffff',
  ])('accepts supported RFC 4122 UUID %s', (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each(['1', '2', '3', '4', '5'])(
    'accepts UUID version %s at the supported boundary',
    (version) => {
      expect(isUuid(`550e8400-e29b-${version}1d4-a716-446655440000`)).toBe(true);
    },
  );

  it.each(['8', '9', 'a', 'b'])('accepts UUID variant nibble %s', (variant) => {
    expect(isUuid(`550e8400-e29b-41d4-${variant}716-446655440000`)).toBe(true);
  });

  it.each([
    undefined,
    '',
    'not-a-uuid',
    '550e8400e29b41d4a716446655440000',
    '550e8400-e29b-01d4-a716-446655440000',
    '550e8400-e29b-61d4-a716-446655440000',
    '550e8400-e29b-41d4-c716-446655440000',
    '550e8400-e29b-41d4-7716-446655440000',
    ' 550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000?extra=1',
    '550e8400-e29b-41d4-a716-446655440000#fragment',
    '550e8400-e29b-41d4-a716-446655440000/path',
    '550e8400-e29b-41d4-a716-446655440000%0A',
    '550e8400-e29b-41d4-a716-446655440000\n',
    '550e8400-e29b-41d4-a716-446655440000\r',
    '550e8400-e29b-41d4-a716-446655440000\r\n',
    '550e8400-e29b-41d4-a716-446655440000\t',
  ])('rejects malformed UUID %p', (value) => {
    expect(isUuid(value)).toBe(false);
  });

  it('requires every UUID segment to have its exact length', () => {
    const malformedSegments = [
      '550e840-e29b-41d4-a716-446655440000',
      '550e84000-e29b-41d4-a716-446655440000',
      '550e8400-e29-41d4-a716-446655440000',
      '550e8400-e29bb-41d4-a716-446655440000',
      '550e8400-e29b-41d-a716-446655440000',
      '550e8400-e29b-41d44-a716-446655440000',
      '550e8400-e29b-41d4-a71-446655440000',
      '550e8400-e29b-41d4-a7166-446655440000',
      '550e8400-e29b-41d4-a716-44665544000',
      '550e8400-e29b-41d4-a716-4466554400000',
    ];

    for (const value of malformedSegments) expect(isUuid(value)).toBe(false);
  });

  it('requires all four UUID separators', () => {
    const separatorIndexes = [8, 13, 18, 23];

    for (const index of separatorIndexes) {
      expect(isUuid(validUuid.slice(0, index) + validUuid.slice(index + 1))).toBe(false);
    }
  });

  it('rejects a string-like object even when it coerces to the valid UUID form', () => {
    // The type guard must reject the value itself: RegExp.test would coerce a
    // hostile durable-blob field through toString and accept the UUID shape.
    const stringLike = { toString: () => validUuid } as unknown as string;
    expect(String(stringLike)).toBe(validUuid);
    expect(isUuid(stringLike)).toBe(false);
  });

  it.each(['', 'not-a-uuid', `${validUuid}\n`, `${validUuid}/smuggled`])(
    'does not search later repeated parameters when the first value is %p',
    (first) => {
      const selected = firstParam([first, validUuid]);

      expect(selected).toBe(first);
      expect(isUuid(selected)).toBe(false);
    },
  );

  it('ignores an unsafe duplicate after a valid first parameter', () => {
    const selected = firstParam([validUuid, `${validUuid}/smuggled`]);

    expect(selected).toBe(validUuid);
    expect(isUuid(selected)).toBe(true);
  });
});

describe('pending assessment metadata', () => {
  const cycleId = '550e8400-e29b-41d4-a716-446655440004';
  const valid = {
    ownerId: '550e8400-e29b-41d4-a716-446655440000',
    endpoint: '/diagnostic/answer',
    questionId: '550e8400-e29b-41d4-a716-446655440001',
    requestId: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: Date.now(),
    retainRecording: false,
    stage: 'direct-posting',
  } as const;

  it('accepts bounded recovery metadata for either assessment endpoint', () => {
    expect(parsePendingAssessment(valid)).toEqual(valid);
    expect(parsePendingAssessment({ ...valid, endpoint: '/practice/attempt', cycleId })).toEqual({
      ...valid,
      endpoint: '/practice/attempt',
      cycleId,
    });
    expect(parsePendingAssessment({ ...valid, endpoint: '/practice/attempt' })).toBeNull();
  });

  it('upgrades metadata from the previous app build to direct posting', () => {
    const { stage: _stage, ...legacy } = valid;
    expect(parsePendingAssessment({ ...legacy, delivery: 'pending' })).toEqual(valid);
  });

  it('accepts only an owner-bound S3 object key', () => {
    const audioKey =
      'audio-uploads/diagnostic/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440003.m4a';
    expect(parsePendingAssessment({ ...valid, stage: 's3-granted', audioKey })).toEqual({
      ...valid,
      stage: 's3-granted',
      audioKey,
    });
    expect(
      parsePendingAssessment({
        ...valid,
        stage: 's3-granted',
        audioKey:
          'audio-uploads/diagnostic/550e8400-e29b-41d4-a716-446655440099/550e8400-e29b-41d4-a716-446655440003.m4a',
      }),
    ).toBeNull();
  });

  it.each([
    null,
    { ...valid, ownerId: 'not-a-uuid' },
    { ...valid, questionId: 'not-a-uuid' },
    { ...valid, requestId: 'not-a-uuid' },
    { ...valid, endpoint: '/diagnostic/next' },
    { ...valid, createdAt: Number.NaN },
    { ...valid, createdAt: -1 },
  ])('rejects malformed or future recovery metadata %#', (value) => {
    expect(parsePendingAssessment(value)).toBeNull();
  });
});
