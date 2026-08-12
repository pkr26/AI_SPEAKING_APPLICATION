import { firstParam, isUuid } from '../lib/params';
import { parsePendingAssessment } from '../lib/pending-assessment';

describe('route parameter helpers', () => {
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

  it.each([
    undefined,
    '',
    'not-a-uuid',
    '550e8400e29b41d4a716446655440000',
    '550e8400-e29b-01d4-a716-446655440000',
    '550e8400-e29b-41d4-c716-446655440000',
    ' 550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000?extra=1',
  ])('rejects malformed UUID %p', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe('pending assessment metadata', () => {
  const valid = {
    ownerId: '550e8400-e29b-41d4-a716-446655440000',
    endpoint: '/diagnostic/answer',
    questionId: '550e8400-e29b-41d4-a716-446655440001',
    requestId: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: Date.now(),
    delivery: 'pending',
  } as const;

  it('accepts bounded recovery metadata for either assessment endpoint', () => {
    expect(parsePendingAssessment(valid)).toEqual(valid);
    expect(
      parsePendingAssessment({ ...valid, endpoint: '/practice/attempt' }),
    ).toEqual({ ...valid, endpoint: '/practice/attempt' });
  });

  it('upgrades metadata from the previous app build to pending delivery', () => {
    const { delivery: _delivery, ...legacy } = valid;
    expect(parsePendingAssessment(legacy)).toEqual(valid);
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
