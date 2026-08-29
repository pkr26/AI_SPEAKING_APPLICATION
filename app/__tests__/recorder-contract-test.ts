import {
  assessmentIdentityMatches,
  audioSessionIsOwnedBy,
  autoStopTapIsWithinGrace,
  canBeginRecorderOperation,
  canContinueRecoveryLoad,
  canReleaseMissingRecovery,
  canStartRecoveryAttempt,
  monotonicNow,
  nextRecordingTakeGeneration,
  pendingAssessmentCanUpload,
  recorderContextIsActive,
  recorderOperationIsCurrent,
  recordingCompletionCanBeAdopted,
  recordingCompletionNeedsWait,
  recordingStatusIsTerminal,
  recordingTerminalFailureShouldInterrupt,
  recoveryDurationForRecordAge,
  recoveryRetryDelayMillis,
  shouldRunRecordingCacheJanitor,
  terminalEventQuarantineIndex,
} from '../src/components/Recorder';
import { ApiError } from '../src/lib/api';

// Recorder imports native modules even when a test uses only its exported pure
// contracts. Keep this suite free of component mounts and native side effects:
// the Recorder campaign executes this file as its own Stryker pass, so no later
// component test can overwrite a decisive contract result or poison its state.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { cache: 'file:///cache' },
  UploadType: { MULTIPART: 'multipart' },
}));

jest.mock('expo-audio', () => ({
  AudioModule: {},
  RecordingPresets: {
    HIGH_QUALITY: {
      web: {},
    },
  },
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440003';
const OTHER_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440004';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440005';
const ENDPOINT = '/practice/attempt' as const;

type Pending = Parameters<typeof pendingAssessmentCanUpload>[0];

function pendingRecord(overrides: Partial<Pending> = {}): Pending {
  return {
    ownerId: OWNER_ID,
    endpoint: ENDPOINT,
    questionId: QUESTION_ID,
    requestId: REQUEST_ID,
    createdAt: 1,
    retainRecording: false,
    stage: 'prepared',
    ...overrides,
  };
}

/**
 * Remediation-03 timeout accounting (102/102): monotonic 4; identity
 * 81,83,88,90,92; active context 93,94,95,96,97,100,101; terminal quarantine
 * 108,112,114,115,116,125; operation admission 143,144,145,146,147,149,151;
 * recovery eligibility/start/continue/release 180,182,183,184,185,186,190,192,
 * 202,203,204,205,207,219,220,222,224,225,226,227,228,229,230,231,232,233,
 * 234; pending upload 253,255,264,266,267,269,272,273; auto-stop grace
 * 309,311,314,315,318; recovery duration 387; audio owner 497,499; terminal
 * status 501,503,504,505,506,507,508,509,510,511,512,513,514,515; completion
 * adoption 532,534,535,536,537,538,539,540,544; terminal failure
 * 553,557,564,565; operation currency 575,577; native completion wait
 * 650,652,653; take generation 674.
 */
describe('Recorder mutation-first pure contracts', () => {
  it('uses a bounded Retry-After only for the coded in-flight conflict', () => {
    expect(
      recoveryRetryDelayMillis(new ApiError(409, 'processing', 7, { code: 'REQUEST_IN_FLIGHT' })),
    ).toBe(7_000);
    expect(
      recoveryRetryDelayMillis(new ApiError(409, 'conflict', 7, { code: 'STATE_CHANGED' })),
    ).toBeNull();
    expect(
      recoveryRetryDelayMillis(new ApiError(500, 'wrong status', 7, { code: 'REQUEST_IN_FLIGHT' })),
    ).toBeNull();
  });

  it('uses the monotonic clock and its wall-clock fallback', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
    const performanceNow = jest.spyOn(performance, 'now').mockReturnValue(321);
    expect(monotonicNow()).toBe(321);
    performanceNow.mockRestore();

    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(654);
    try {
      Object.defineProperty(globalThis, 'performance', {
        configurable: true,
        value: undefined,
      });
      expect(monotonicNow()).toBe(654);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'performance', descriptor);
      dateNow.mockRestore();
    }
  });

  it.each([
    ['owner', { ownerId: OTHER_OWNER_ID }, false],
    ['endpoint', { endpoint: '/diagnostic/answer' as const }, false],
    ['question', { questionId: OTHER_QUESTION_ID }, false],
    ['matching', {}, true],
  ])('matches every assessment identity dimension for %s', (_case, overrides, expected) => {
    expect(
      assessmentIdentityMatches(
        { ownerId: OWNER_ID, endpoint: ENDPOINT, questionId: QUESTION_ID, ...overrides },
        OWNER_ID,
        ENDPOINT,
        QUESTION_ID,
      ),
    ).toBe(expected);
  });

  it.each([
    ['current', true, true, 'active', true],
    ['unmounted', false, true, 'active', false],
    ['blurred', true, false, 'active', false],
    ['inactive', true, true, 'inactive', false],
    ['background', true, true, 'background', false],
  ])('requires the complete active context for %s', (_case, mounted, focused, state, expected) => {
    expect(recorderContextIsActive(mounted, focused, state)).toBe(expected);
  });

  it.each([
    ['matching URI', 'file:///old.m4a', false, 2, 0],
    ['different URI while idle', 'file:///other.m4a', false, 2, -1],
    ['different URI during a newer take', 'file:///other.m4a', true, 2, 1],
    ['different URI in the same generation', 'file:///other.m4a', true, 1, -1],
    ['missing URI during a newer take', null, true, 2, 0],
    ['missing URI while idle', null, false, 2, -1],
    ['missing URI in the same generation', null, true, 1, -1],
  ])(
    'selects only the authoritative terminal quarantine for %s',
    (_case, uri, recording, generation, expected) => {
      expect(
        terminalEventQuarantineIndex(
          [
            { takeGeneration: 1, uri: 'file:///old.m4a' },
            { takeGeneration: 1, uri: null },
          ],
          uri,
          recording,
          generation,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ['idle', false, false, 0, true],
    ['owned', false, true, 0, false],
    ['in flight', false, false, 1, false],
    ['superseding', true, true, 1, true],
  ])('admits a Recorder operation only when %s', (_case, supersede, owned, count, expected) => {
    expect(canBeginRecorderOperation(supersede, owned, count)).toBe(expected);
  });

  it.each([
    ['eligible idle', false, false, false, true, true, 'idle', true],
    ['existing attempt', true, false, false, true, true, 'idle', false],
    ['already recovering', false, true, false, true, true, 'idle', false],
    ['upload exists', false, false, true, true, true, 'idle', false],
    ['inactive context', false, false, false, false, true, 'idle', false],
    ['stale identity', false, false, false, true, false, 'idle', false],
    ['recording phase', false, false, false, true, true, 'recording', false],
    ['eligible recovery', false, false, false, true, true, 'recovering', true],
  ] as const)(
    'requires every recovery-start dimension for %s',
    (_case, attempted, recovering, upload, context, identity, phase, expected) => {
      expect(canStartRecoveryAttempt(attempted, recovering, upload, context, identity, phase)).toBe(
        expected,
      );
    },
  );

  it.each([
    ['eligible', true, true, false, true, true, 'idle', false, true],
    ['missing pending', false, true, false, true, true, 'idle', false, false],
    ['stale operation', true, false, false, true, true, 'idle', false, false],
    ['upload exists', true, true, true, true, true, 'idle', false, false],
    ['inactive context', true, true, false, false, true, 'idle', false, false],
    ['stale identity', true, true, false, true, false, 'idle', false, false],
    ['wrong phase', true, true, false, true, true, 'recording', false, false],
    ['other owner', true, true, false, true, true, 'idle', true, false],
  ] as const)(
    'requires every post-load recovery dimension for %s',
    (_case, pending, operation, upload, context, identity, phase, otherOwner, expected) => {
      expect(
        canContinueRecoveryLoad(pending, operation, upload, context, identity, phase, otherOwner),
      ).toBe(expected);
    },
  );

  it.each([
    ['eligible', 'recovering', true, false, true, true, false, true],
    ['idle phase', 'idle', true, false, true, true, false, false],
    ['stale operation', 'recovering', false, false, true, true, false, false],
    ['upload exists', 'recovering', true, true, true, true, false, false],
    ['inactive context', 'recovering', true, false, false, true, false, false],
    ['stale identity', 'recovering', true, false, true, false, false, false],
    ['other owner', 'recovering', true, false, true, true, true, false],
  ] as const)(
    'releases a missing recovery only when %s',
    (_case, phase, operation, upload, context, identity, otherOwner, expected) => {
      expect(
        canReleaseMissingRecovery(phase, operation, upload, context, identity, otherOwner),
      ).toBe(expected);
    },
  );

  it.each([
    ['matching', {}, true],
    ['request', { requestId: OTHER_REQUEST_ID }, false],
    ['owner', { ownerId: OTHER_OWNER_ID }, false],
    ['endpoint', { endpoint: '/diagnostic/answer' as const }, false],
    ['question', { questionId: OTHER_QUESTION_ID }, false],
    ['retention choice', { retainRecording: true }, false],
    ['stage', { stage: 's3-granted' as const }, false],
    ['cancelled', { cancelRequested: true }, false],
    ['spent recovery POST', { recoveryPostAttempts: 1 }, false],
  ])('uploads only the authoritative prepared handoff for %s', (_case, overrides, expected) => {
    expect(
      pendingAssessmentCanUpload(
        pendingRecord(overrides),
        OWNER_ID,
        ENDPOINT,
        QUESTION_ID,
        REQUEST_ID,
        false,
      ),
    ).toBe(expected);
  });

  it.each([
    [-1, false],
    [0, true],
    [999, true],
    [1_000, false],
  ])('bounds auto-stop tap grace at %ims', (elapsed, expected) => {
    expect(autoStopTapIsWithinGrace(elapsed)).toBe(expected);
  });

  it.each([
    [25 * 60 * 60_000 - 1, 5 * 60_000],
    [25 * 60 * 60_000, 5 * 60_000],
    [25 * 60 * 60_000 + 1, 0],
  ])('bounds recovery duration for age %ims', (age, expected) => {
    expect(recoveryDurationForRecordAge(age)).toBe(expected);
  });

  it('recognizes only the exact audio-session owner', () => {
    const owner = Symbol('owner');
    expect(audioSessionIsOwnedBy(owner, owner)).toBe(true);
    expect(audioSessionIsOwnedBy(Symbol('other'), owner)).toBe(false);
    expect(audioSessionIsOwnedBy(null, owner)).toBe(false);
  });

  it.each([
    ['ordinary', false, false, false, false],
    ['finished', true, false, false, true],
    ['error', false, true, false, true],
    ['reset', false, false, true, true],
  ])('classifies terminal recording status for %s', (_case, finished, error, reset, expected) => {
    expect(
      recordingStatusIsTerminal({
        isFinished: finished,
        hasError: error,
        mediaServicesDidReset: reset,
      }),
    ).toBe(expected);
  });

  it.each([
    ['terminal event', 'recording', false, false, false, true, false, true, true],
    ['observed native stop', 'recording', false, false, false, false, true, false, true],
    ['wrong phase', 'idle', false, false, false, true, false, true, false],
    ['operation active', 'recording', true, false, false, true, false, true, false],
    ['media reset', 'recording', false, true, false, true, false, true, false],
    ['still recording', 'recording', false, false, true, true, false, true, false],
    ['paused', 'recording', false, false, false, false, true, true, false],
    ['never observed', 'recording', false, false, false, false, false, false, false],
  ] as const)(
    'adopts a recording completion only for %s',
    (_case, phase, operation, reset, recording, finished, observed, canRecord, expected) => {
      expect(
        recordingCompletionCanBeAdopted(
          phase,
          operation,
          reset,
          recording,
          finished,
          observed,
          canRecord,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ['encoder error', 'recording', false, { hasError: true, mediaServicesDidReset: false }, true],
    ['media reset', 'recording', false, { hasError: false, mediaServicesDidReset: true }, true],
    [
      'ordinary completion',
      'recording',
      false,
      { hasError: false, mediaServicesDidReset: false },
      false,
    ],
    ['missing completion', 'recording', false, null, false],
    [
      'operation active',
      'recording',
      true,
      { hasError: true, mediaServicesDidReset: false },
      false,
    ],
    ['wrong phase', 'recorded', false, { hasError: true, mediaServicesDidReset: false }, false],
  ] as const)(
    'interrupts terminal failure only for %s',
    (_case, phase, operation, completion, expected) => {
      expect(recordingTerminalFailureShouldInterrupt(phase, operation, completion)).toBe(expected);
    },
  );

  it.each([
    ['current', true, true, true, true, true],
    ['operation', false, true, true, true, false],
    ['lifecycle', true, false, true, true, false],
    ['identity', true, true, false, true, false],
    ['context', true, true, true, false, false],
  ])(
    'requires every operation-currency dimension for %s',
    (_case, operation, lifecycle, identity, context, expected) => {
      expect(recorderOperationIsCurrent(operation, lifecycle, identity, context)).toBe(expected);
    },
  );

  it.each([
    ['native startup', 'ios', false, false, true],
    ['web', 'web', false, false, false],
    ['already ran', 'ios', true, false, false],
    ['audio owned', 'ios', false, true, false],
  ])('runs the cache janitor only for %s', (_case, platform, ran, owned, expected) => {
    expect(shouldRunRecordingCacheJanitor(platform, ran, owned)).toBe(expected);
  });

  it.each([
    ['ios', true],
    ['android', true],
    ['web', false],
  ])('waits for an explicit native completion event on %s', (platform, expected) => {
    expect(recordingCompletionNeedsWait(platform)).toBe(expected);
  });

  it('increments take generations exactly once', () => {
    expect(nextRecordingTakeGeneration(0)).toBe(1);
    expect(nextRecordingTakeGeneration(41)).toBe(42);
  });
});
