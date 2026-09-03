/**
 * Adversarial recovery audit (pure logic, no rendered components):
 * process-death matrix over the durable assessment handoff, kill-point
 * ordering invariants, multi-device cache interleavings, clock-adversarial
 * stats, deep-link parameter edges, and replay identity binding.
 */
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import { apiGetPracticeStats } from '../src/lib/api';
import { parseAssessmentReplayStatus } from '../src/lib/assessment-replay';
import { firstParam, isUuid } from '../src/lib/params';
import type { PendingAssessment } from '../src/lib/pending-assessment';
import { applyFailedAttemptToQuestionCache } from '../src/lib/practice-flow';
import { ContractError } from '../src/lib/types';
import type {
  AttemptResult,
  HistoryItem,
  HistoryPage,
  NativeAttemptResult,
  PracticeQuestionPayload,
  Question,
  RecordingItem,
  RecordingPage,
  User,
} from '../src/lib/types';
import { clearHistoryRecordingReferences, emptyRecordingPages } from '../src/app/settings/index';
import {
  applyRecordingDeletionToCache,
  removeRecordingFromHistoryPages,
  removeRecordingFromPages,
} from '../src/components/RecordingPlayback';

const mockStorage = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
}));

// Only module evaluation of the .tsx helpers reaches these; nothing renders.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/mock-cache' },
  Directory: jest.fn(),
  File: jest.fn(),
  UploadType: { MULTIPART: 'multipart' },
}));

// See api-test.ts for why fresh module graphs use require instead of import().
declare const require: (id: string) => unknown;

type PendingAssessmentModule = typeof import('../src/lib/pending-assessment');
type SecureStoreModule = typeof import('expo-secure-store');

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const NEXT_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440004';
const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';
const OTHER_ID = '550e8400-e29b-41d4-a716-446655440099';
const OTHER_CYCLE_ID = '550e8400-e29b-41d4-a716-446655440077';
const CREATED_AT = 1_700_000_000_000;
const FEEDBACK_READY_AT = CREATED_AT + 60_000;
const AUDIO_KEY = `audio-uploads/practice/${OWNER_ID}/${REQUEST_ID}.m4a`;
const STORAGE_KEY = 'pending_assessment_v1';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushMicrotasks(turns = 8): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    await Promise.resolve();
  }
}

/** Simulates process death: a fresh module graph over the same SecureStore backing. */
function loadFreshPendingModule(): PendingAssessmentModule {
  jest.resetModules();
  return require('../src/lib/pending-assessment') as PendingAssessmentModule;
}

/** Fresh module graph plus handles onto the freshly created SecureStore mocks. */
function loadFreshPendingModuleWithStore(): {
  secureStore: SecureStoreModule;
  mod: PendingAssessmentModule;
} {
  jest.resetModules();
  const secureStore = require('expo-secure-store') as SecureStoreModule;
  const mod = require('../src/lib/pending-assessment') as PendingAssessmentModule;
  return { secureStore, mod };
}

const basePending: PendingAssessment = {
  ownerId: OWNER_ID,
  endpoint: '/practice/attempt',
  questionId: QUESTION_ID,
  cycleId: CYCLE_ID,
  requestId: REQUEST_ID,
  createdAt: CREATED_AT,
  retainRecording: false,
  stage: 'direct-posting',
};

describe('adversarial recovery audit', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  // ---------------------------------------------------------------- 1. matrix
  describe('process-death matrix over the durable handoff', () => {
    const STAGES = [
      'prepared',
      'direct-posting',
      's3-granted',
      'reconcile',
      'feedback-pending',
    ] as const;

    interface ProcessDeathCell {
      stage: PendingAssessment['stage'];
      cancelRequested?: boolean;
      recoveryPostAttempts: 0 | 1;
      retainRecording: boolean;
    }

    const matrix: ProcessDeathCell[] = [];
    for (const stage of STAGES) {
      for (const cancelRequested of [undefined, true] as const) {
        for (const recoveryPostAttempts of [0, 1] as const) {
          for (const retainRecording of [true, false] as const) {
            matrix.push({ stage, cancelRequested, recoveryPostAttempts, retainRecording });
          }
        }
      }
    }

    /** The exact record a reloaded process must observe after death. */
    function expectedAfterReload(cell: ProcessDeathCell): PendingAssessment {
      return {
        ...basePending,
        stage: cell.stage,
        retainRecording: cell.retainRecording,
        ...(cell.stage === 'feedback-pending' ? { feedbackReadyAt: FEEDBACK_READY_AT } : {}),
        ...(cell.stage === 's3-granted' ? { audioKey: AUDIO_KEY } : {}),
        ...(cell.cancelRequested !== undefined ? { cancelRequested: cell.cancelRequested } : {}),
        recoveryPostAttempts: cell.recoveryPostAttempts,
      };
    }

    it.each(matrix)(
      'reloads stage=$stage cancel=%p attempts=$recoveryPostAttempts retain=$retainRecording intact',
      async (cell) => {
        const writer = loadFreshPendingModule();
        // The S3 key is authored on EVERY stage: only s3-granted may keep it.
        await writer.savePendingAssessment({
          ...basePending,
          stage: cell.stage,
          retainRecording: cell.retainRecording,
          ...(cell.stage === 'feedback-pending' ? { feedbackReadyAt: FEEDBACK_READY_AT } : {}),
          audioKey: AUDIO_KEY,
          ...(cell.cancelRequested ? { cancelRequested: true } : {}),
          recoveryPostAttempts: cell.recoveryPostAttempts,
        });

        // Process death: a brand-new module instance must read the same slot.
        const reloaded = loadFreshPendingModule();
        const loaded = await reloaded.loadPendingAssessment();
        const expected = expectedAfterReload(cell);
        expect(loaded).not.toBeNull();
        if (!loaded) throw new Error('reload unexpectedly returned null');
        expect(loaded).toEqual(expected);
        if (cell.stage === 's3-granted') {
          expect(loaded).toHaveProperty('audioKey', AUDIO_KEY);
        } else {
          expect(loaded).not.toHaveProperty('audioKey');
        }

        // Durable JSON fidelity: the persisted slot equals the same record and
        // never leaks an S3 key outside the s3-granted stage.
        const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
        expect(stored).toEqual({ ...expected });
        expect(Object.hasOwn(stored, 'audioKey')).toBe(cell.stage === 's3-granted');
        expect(Object.hasOwn(stored, 'cancelRequested')).toBe(cell.cancelRequested !== undefined);

        // Feedback expiry math: 47h59m after creation is inside the server's
        // 48-hour replay SLA; exactly 48h is expired for delivered feedback.
        const retention = reloaded.PENDING_FEEDBACK_RETENTION_MS;
        expect(
          reloaded.pendingAssessmentFeedbackIsExpired(loaded, CREATED_AT + retention - 60_000),
        ).toBe(false);
        expect(reloaded.pendingAssessmentFeedbackIsExpired(loaded, CREATED_AT + retention)).toBe(
          cell.stage === 'feedback-pending',
        );

        if (cell.stage === 'feedback-pending') {
          // Delivered feedback is monotonic: the recovery budget stays closed.
          await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            false,
          );
          await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            false,
          );
        } else {
          // One automatic recovery POST across remounts, refunded exactly once.
          const firstClaimMaySucceed = cell.recoveryPostAttempts === 0;
          await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            firstClaimMaySucceed,
          );
          await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            false,
          );
          await expect(reloaded.refundPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            true,
          );
          await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(true);
          // Refunding at a zero balance is a no-op success, never negative.
          await expect(reloaded.refundPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            true,
          );
          await expect(reloaded.refundPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(
            true,
          );
        }

        // A second process death after the budget dance still round-trips the
        // exact record, with cancellation intent and stage preserved.
        const afterOps = loadFreshPendingModule();
        expect(await afterOps.loadPendingAssessment()).toEqual(
          cell.stage === 'feedback-pending' ? expected : { ...expected, recoveryPostAttempts: 0 },
        );
      },
    );

    it('refuses a second recovery claim from a fresh process even when the counter was hand-authored at the cap', async () => {
      const writer = loadFreshPendingModule();
      await writer.savePendingAssessment({ ...basePending, stage: 'prepared' });
      await expect(writer.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(true);

      const reloaded = loadFreshPendingModule();
      await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(false);
      await expect(reloaded.refundPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(true);
      await expect(reloaded.claimPendingAssessmentRecoveryPost(REQUEST_ID)).resolves.toBe(true);
    });

    it('normalizes a backward wall clock so a rolled-back feedback pointer still reloads', async () => {
      const writer = loadFreshPendingModule();
      await writer.savePendingAssessment({ ...basePending, stage: 'direct-posting' });

      // The clock rolls back to a day before the handoff was created.
      const rolledBackNow = CREATED_AT - 86_400_000;
      await expect(
        writer.markPendingAssessmentFeedbackPending(REQUEST_ID, rolledBackNow),
      ).resolves.toBe(true);

      const reloaded = loadFreshPendingModule();
      const loaded = await reloaded.loadPendingAssessment();
      expect(loaded).toEqual({
        ...basePending,
        stage: 'feedback-pending',
        feedbackReadyAt: CREATED_AT,
      });
      // The rolled-back clock itself never marks the pointer expired.
      expect(
        reloaded.pendingAssessmentFeedbackIsExpired(loaded ?? basePending, rolledBackNow),
      ).toBe(false);
    });

    it('deletes a raw handoff that violates the feedbackReadyAt ordering invariant', async () => {
      // A hostile or corrupted store entry with feedbackReadyAt < createdAt is
      // unparseable; the loader must heal the slot instead of replaying it.
      mockStorage.set(
        STORAGE_KEY,
        JSON.stringify({
          ...basePending,
          stage: 'feedback-pending',
          feedbackReadyAt: CREATED_AT - 1,
        }),
      );

      const reloaded = loadFreshPendingModule();
      expect(await reloaded.loadPendingAssessment()).toBeNull();
      expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    });
  });

  // ---------------------------------------------------- 2. kill-point ordering
  describe('kill-point ordering invariants', () => {
    it('lets the second concurrent creator observe only the first record', async () => {
      const { secureStore, mod } = loadFreshPendingModuleWithStore();
      const read = deferred<string | null>();
      const getItem = jest.mocked(secureStore.getItemAsync);
      getItem.mockImplementationOnce(async () => read.promise);

      const first = { ...basePending, stage: 'prepared' as const };
      const second = { ...first, requestId: OTHER_ID };
      const generation = mod.capturePendingAssessmentGeneration();

      const creatingFirst = mod.ensurePendingAssessment(first, generation);
      const creatingSecond = mod.ensurePendingAssessment(second, generation);
      // Observe early rejections immediately: under a validation mutant these
      // promises reject during the flush below while Promise.all is not yet
      // attached, and Node treats that as an unhandled rejection, killing the
      // worker before Jest can fail the test — Stryker would then score an
      // unattributable RuntimeError instead of the kill this suite proves.
      creatingFirst.catch(() => undefined);
      creatingSecond.catch(() => undefined);
      await flushMicrotasks();
      expect(getItem).toHaveBeenCalledTimes(1); // Exactly one in-flight read.
      read.resolve(null);

      await expect(Promise.all([creatingFirst, creatingSecond])).resolves.toEqual([first, first]);
      expect(jest.mocked(secureStore.setItemAsync)).toHaveBeenCalledTimes(1);
      expect(await mod.loadPendingAssessment()).toEqual(first);
    });

    it('never downgrades delivered feedback into a reconciliation tombstone', async () => {
      const { mod } = loadFreshPendingModuleWithStore();
      const feedbackPending = {
        ...basePending,
        stage: 'feedback-pending' as const,
        feedbackReadyAt: FEEDBACK_READY_AT,
      };
      await mod.savePendingAssessment(feedbackPending);

      await expect(mod.markPendingAssessmentForReconciliation(REQUEST_ID)).resolves.toBe(false);

      const reloaded = loadFreshPendingModule();
      expect(await reloaded.loadPendingAssessment()).toEqual(feedbackPending);
    });

    it('strips the audio key on the non-S3 stage and requires it on s3-granted', async () => {
      const { secureStore, mod } = loadFreshPendingModuleWithStore();
      const setItem = jest.mocked(secureStore.setItemAsync);
      await mod.savePendingAssessment({ ...basePending, stage: 's3-granted', audioKey: AUDIO_KEY });

      // A caller may pass the key with the direct stage; it must be dropped.
      await expect(
        mod.markPendingAssessmentStage(REQUEST_ID, 'direct-posting', AUDIO_KEY),
      ).resolves.toBe(true);
      expect(await mod.loadPendingAssessment()).toEqual({
        ...basePending,
        stage: 'direct-posting',
      });

      // s3-granted without a key is invalid and must not touch the record.
      setItem.mockClear();
      await expect(mod.markPendingAssessmentStage(REQUEST_ID, 's3-granted')).rejects.toThrow(
        'Invalid pending assessment metadata',
      );
      expect(setItem).not.toHaveBeenCalled();
      expect(await mod.loadPendingAssessment()).toEqual({
        ...basePending,
        stage: 'direct-posting',
      });

      // A matching key re-arms the S3 stage.
      await expect(
        mod.markPendingAssessmentStage(REQUEST_ID, 's3-granted', AUDIO_KEY),
      ).resolves.toBe(true);
      expect(await mod.loadPendingAssessment()).toEqual({
        ...basePending,
        stage: 's3-granted',
        audioKey: AUDIO_KEY,
      });
    });

    it('bumps the generation so an in-flight creator with the old generation returns null', async () => {
      const { secureStore, mod } = loadFreshPendingModuleWithStore();
      const read = deferred<string | null>();
      const getItem = jest.mocked(secureStore.getItemAsync);
      const setItem = jest.mocked(secureStore.setItemAsync);
      const deleteItem = jest.mocked(secureStore.deleteItemAsync);
      getItem.mockImplementationOnce(async () => read.promise);
      setItem.mockClear();
      deleteItem.mockClear();

      const generation = mod.capturePendingAssessmentGeneration();
      const candidate = { ...basePending, stage: 'prepared' as const };

      const creating = mod.ensurePendingAssessment(candidate, generation);
      // Same early-rejection observation as the concurrency invariant above.
      creating.catch(() => undefined);
      await flushMicrotasks();
      expect(getItem).toHaveBeenCalledTimes(1);

      // Unconditional account/session clear begins while the read is pending.
      const clearing = mod.clearPendingAssessment();
      expect(mod.capturePendingAssessmentGeneration()).toBe(generation + 1);

      read.resolve(null);
      await expect(creating).resolves.toBeNull();
      await expect(clearing).resolves.toBeUndefined();

      expect(setItem).not.toHaveBeenCalled();
      expect(deleteItem).toHaveBeenCalledTimes(1);
      expect(mockStorage.has(STORAGE_KEY)).toBe(false);
      expect(await mod.loadPendingAssessment()).toBeNull();
    });
  });

  // ------------------------------------------------- 3. cache interleavings
  describe('multi-device interleavings at the cache layer', () => {
    const USER: User = {
      id: OWNER_ID,
      name: 'Learner',
      email: 'learner@example.com',
      nativeLanguage: 'te',
      uiLanguage: 'en',
      cefrLevel: 'B1',
      diagnosticCompleted: true,
    };
    const QUESTION: Question = {
      id: QUESTION_ID,
      cefrLevel: 'B1',
      promptWord: 'courage',
      questionText: 'Describe a time you showed courage.',
    };
    const questionKey = ['practice-question', USER.id, USER.cefrLevel] as const;

    function seededPayload(
      overrides: Partial<PracticeQuestionPayload> = {},
    ): PracticeQuestionPayload {
      return {
        question: QUESTION,
        kind: 'new',
        progress: { masteredCount: 4, learningCount: 5, totalAtLevel: 100, dueCount: 2 },
        cycleId: CYCLE_ID,
        attemptsUsed: 0,
        attemptsLeft: 3,
        ...overrides,
      };
    }

    const failedEnglish: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I try answer.',
      feedback: 'Add more detail.',
    };

    function failedNative(): NativeAttemptResult {
      return {
        mode: 'native',
        nativeLanguage: 'te',
        cycleId: CYCLE_ID,
        understood: false,
        attemptNo: 1,
        attemptsLeft: 2,
        transcript: 'నేను ధైర్యంగా ఉన్నాను.',
        translatedTranscript: 'I was brave.',
        modelAnswer: 'I showed courage.',
        feedback: 'Keep practicing.',
      };
    }

    // setQueryData schedules per-query garbage-collection timers, so every
    // client built here is cleared after each test to keep Jest's loop open-free.
    const trackedClients: QueryClient[] = [];
    afterEach(() => {
      for (const client of trackedClients) client.clear();
      trackedClients.length = 0;
    });

    function trackedClient(): QueryClient {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      trackedClients.push(client);
      return client;
    }

    function clientWithSeed(payload: PracticeQuestionPayload = seededPayload()): {
      client: QueryClient;
      seed: PracticeQuestionPayload;
    } {
      const client = trackedClient();
      client.setQueryData<PracticeQuestionPayload>([...questionKey], payload);
      return { client, seed: payload };
    }

    it('bumps learningCount once and mirrors attemptsUsed for a failed new English attempt', () => {
      const { client, seed } = clientWithSeed();

      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, failedEnglish);
      // Replaying the same failure must not bump the revision counter twice.
      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, failedEnglish);

      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual({
        ...seed,
        kind: 'revision',
        attemptsUsed: 1,
        attemptsLeft: 2,
        progress: { ...seed.progress, learningCount: 6 },
      });
    });

    it('transitions a failed native attempt into revision with the same single bump', () => {
      const { client, seed } = clientWithSeed();

      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, failedNative());

      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual({
        ...seed,
        kind: 'revision',
        attemptsUsed: 1,
        attemptsLeft: 2,
        progress: { ...seed.progress, learningCount: 6 },
      });
    });

    it('leaves silence as a free retry that never touches the cached question', () => {
      const { client, seed } = clientWithSeed();
      const silent: AttemptResult = {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 3,
        score: 0,
        transcript: '',
        feedback: 'No speech detected.',
        noSpeech: true,
      };

      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, silent);

      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual(seed);
    });

    it('ignores failures bound to a stale cycle or question', () => {
      const staleCycle: AttemptResult = { ...failedEnglish, cycleId: OTHER_CYCLE_ID };
      const { client, seed } = clientWithSeed();

      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, staleCycle);
      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual(seed);

      applyFailedAttemptToQuestionCache(client, USER, OTHER_ID, failedEnglish);
      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual(seed);
    });

    it('leaves the cache untouched for a passed English attempt', () => {
      const { client, seed } = clientWithSeed();
      const passed: AttemptResult = {
        cycleId: CYCLE_ID,
        passed: true,
        mastered: true,
        attemptNo: 2,
        attemptsLeft: 0,
        score: 88,
        transcript: 'I spoke up with courage at work.',
        feedback: 'Great answer.',
        next: {
          question: { ...QUESTION, id: NEXT_QUESTION_ID, promptWord: 'journey' },
          kind: 'new',
          progress: { masteredCount: 5, learningCount: 5, totalAtLevel: 100, dueCount: 2 },
          cycleId: OTHER_CYCLE_ID,
          attemptsUsed: 0,
          attemptsLeft: 3,
        },
      };

      applyFailedAttemptToQuestionCache(client, USER, QUESTION_ID, passed);

      expect(client.getQueryData<PracticeQuestionPayload>([...questionKey])).toEqual(seed);
    });

    // ---- settings + RecordingPlayback pure page/cursor helpers

    const PAGE_ONE_CURSOR = '550e8400-e29b-41d4-a716-446655440030';
    const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
    const OTHER_RECORDING_ID = '550e8400-e29b-41d4-a716-446655440012';

    function recordingItem(id: string): RecordingItem {
      return {
        id,
        questionId: QUESTION_ID,
        context: 'practice',
        promptWord: 'courage',
        questionText: 'Describe a time you showed courage.',
        cefrLevel: 'B1',
        contentType: 'audio/mp4',
        sizeBytes: 4_096,
        durationMs: 4_000,
        status: 'available',
        createdAt: '2026-08-28T10:00:00.000Z',
        availableAt: '2026-08-28T10:01:00.000Z',
      };
    }

    function historyItem(
      id: string,
      recordingId: string | null,
      overrides: Partial<HistoryItem> = {},
    ): HistoryItem {
      return {
        id,
        questionId: QUESTION_ID,
        promptWord: 'courage',
        questionText: 'Describe a time you showed courage.',
        cefrLevel: 'B1',
        context: 'practice',
        nativeLanguage: null,
        cycleId: CYCLE_ID,
        attemptNo: 1,
        score: 70,
        passed: true,
        understood: null,
        transcript: 'I spoke up.',
        translatedTranscript: null,
        modelAnswer: null,
        feedback: 'Good.',
        createdAt: '2026-08-28T10:00:00.000Z',
        // The server parser always emits explicit nulls for recording-less rows.
        recordingId,
        recordingStatus: recordingId === null ? null : ('available' as const),
        ...overrides,
      };
    }

    const HISTORY_ROW_ONE = '550e8400-e29b-41d4-a716-446655440041';
    const HISTORY_ROW_TWO = '550e8400-e29b-41d4-a716-446655440042';
    const HISTORY_ROW_THREE = '550e8400-e29b-41d4-a716-446655440043';

    function historyPages(): InfiniteData<HistoryPage> {
      return {
        pages: [
          {
            items: [
              historyItem(HISTORY_ROW_ONE, RECORDING_ID),
              historyItem(HISTORY_ROW_TWO, OTHER_RECORDING_ID),
            ],
            nextCursor: PAGE_ONE_CURSOR,
          },
          { items: [historyItem(HISTORY_ROW_THREE, null)], nextCursor: null },
        ],
        pageParams: [undefined, PAGE_ONE_CURSOR],
      };
    }

    function recordingPages(): InfiniteData<RecordingPage> {
      return {
        pages: [
          {
            items: [recordingItem(RECORDING_ID), recordingItem(OTHER_RECORDING_ID)],
            nextCursor: PAGE_ONE_CURSOR,
          },
          { items: [], nextCursor: null },
        ],
        pageParams: [undefined, PAGE_ONE_CURSOR],
      };
    }

    function pagesShape(data: InfiniteData<RecordingPage> | undefined): {
      pageLengths: number[];
      cursors: (string | null)[];
      pageParams: unknown[];
    } {
      if (!data) throw new Error('expected recording pages');
      return {
        pageLengths: data.pages.map((page) => page.items.length),
        cursors: data.pages.map((page) => page.nextCursor),
        pageParams: data.pageParams,
      };
    }

    it('empties every recordings page while preserving page count and params', () => {
      const data = recordingPages();
      const emptied = emptyRecordingPages(data);
      expect(pagesShape(emptied)).toEqual({
        pageLengths: [0, 0],
        cursors: [null, null],
        pageParams: [undefined, PAGE_ONE_CURSOR],
      });
      // Original pages are not mutated in place.
      expect(data.pages[0]?.items).toHaveLength(2);
      expect(emptyRecordingPages(undefined)).toBeUndefined();
    });

    it('keeps history rows while clearing every recording reference', () => {
      const cleared = clearHistoryRecordingReferences(historyPages());

      expect(cleared?.pages).toHaveLength(2);
      const allRows = cleared?.pages.flatMap((page) => page.items) ?? [];
      expect(allRows.map((row) => row.id)).toEqual([
        HISTORY_ROW_ONE,
        HISTORY_ROW_TWO,
        HISTORY_ROW_THREE,
      ]);
      for (const row of allRows) {
        expect(row.recordingId).toBeNull();
        expect(row.recordingStatus).toBeNull();
        // Learning feedback survives the audio capability wipe.
        expect(row.transcript).toBe('I spoke up.');
        expect(row.feedback).toBe('Good.');
      }
      expect(cleared?.pages[0]?.nextCursor).toBe(PAGE_ONE_CURSOR);
      expect(cleared?.pages[1]?.nextCursor).toBeNull();
      expect(clearHistoryRecordingReferences(undefined)).toBeUndefined();
    });

    it('removes only the matching recording page row and preserves cursors', () => {
      const data = recordingPages();
      const removed = removeRecordingFromPages(data, RECORDING_ID);
      expect(removed?.pages[0]?.items.map((item) => item.id)).toEqual([OTHER_RECORDING_ID]);
      expect(removed?.pages[0]?.nextCursor).toBe(PAGE_ONE_CURSOR);
      expect(removed?.pages[1]?.items).toEqual([]);

      const unknownRemoval = removeRecordingFromPages(data, OTHER_ID);
      expect(unknownRemoval?.pages[0]?.items).toHaveLength(2);
      expect(removeRecordingFromPages(undefined, RECORDING_ID)).toBeUndefined();
    });

    it('keeps history rows while unlinking only the deleted recording', () => {
      const removed = removeRecordingFromHistoryPages(historyPages(), RECORDING_ID);
      const rows = removed?.pages.flatMap((page) => page.items) ?? [];

      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatchObject({
        id: HISTORY_ROW_ONE,
        recordingId: null,
        recordingStatus: null,
      });
      expect(rows[1]).toMatchObject({
        id: HISTORY_ROW_TWO,
        recordingId: OTHER_RECORDING_ID,
        recordingStatus: 'available',
      });
      expect(rows[2]?.recordingId).toBeNull();
      expect(removed?.pages[0]?.nextCursor).toBe(PAGE_ONE_CURSOR);
      expect(removeRecordingFromHistoryPages(undefined, RECORDING_ID)).toBeUndefined();
    });

    it('applies a recording deletion to both caches under their real query keys', () => {
      const client = trackedClient();
      client.setQueryData<InfiniteData<RecordingPage>>(['recordings', OWNER_ID], recordingPages());
      client.setQueryData<InfiniteData<HistoryPage>>(
        ['practice-history', OWNER_ID],
        historyPages(),
      );

      applyRecordingDeletionToCache(client, OWNER_ID, RECORDING_ID);
      // A second (already-deleted) application stays stable.
      applyRecordingDeletionToCache(client, OWNER_ID, RECORDING_ID);

      const recordings = client.getQueryData<InfiniteData<RecordingPage>>(['recordings', OWNER_ID]);
      expect(recordings?.pages[0]?.items.map((item) => item.id)).toEqual([OTHER_RECORDING_ID]);
      expect(recordings?.pages[0]?.nextCursor).toBe(PAGE_ONE_CURSOR);

      const history = client.getQueryData<InfiniteData<HistoryPage>>([
        'practice-history',
        OWNER_ID,
      ]);
      const rows = history?.pages.flatMap((page) => page.items) ?? [];
      expect(rows.map((row) => row.id)).toEqual([
        HISTORY_ROW_ONE,
        HISTORY_ROW_TWO,
        HISTORY_ROW_THREE,
      ]);
      expect(rows[0]?.recordingId).toBeNull();
      expect(rows[1]?.recordingId).toBe(OTHER_RECORDING_ID);
    });
  });

  // -------------------------------------------------- 4. clock on stats/timezone
  describe('clock-adversarial practice stats timezone', () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;

    function fakeResponse(json: () => Promise<unknown>): Response {
      return {
        ok: true,
        status: 200,
        json,
        headers: { get: () => null },
      } as unknown as Response;
    }

    const STATS = {
      level: 'B1',
      progress: { masteredCount: 4, learningCount: 5, totalAtLevel: 100, dueCount: 3 },
      streakDays: 2,
      practicedToday: 1,
      totalAttempts: 40,
      lastPracticedAt: '2026-08-29T10:00:00.000Z',
    };

    beforeAll(() => {
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    afterEach(() => {
      fetchMock.mockReset();
    });

    function mockResolvedZone(timeZone: unknown, options?: { throws?: boolean }): jest.SpyInstance {
      const spy = jest.spyOn(Intl, 'DateTimeFormat');
      if (options?.throws) {
        spy.mockImplementation(() => {
          throw new Error('Intl timezone data missing');
        });
      } else {
        spy.mockReturnValue({
          resolvedOptions: () => ({ timeZone }),
        } as unknown as Intl.DateTimeFormat);
      }
      return spy;
    }

    it('passes the resolved device timezone through URL-encoding', async () => {
      const spy = mockResolvedZone('Asia/Kolkata');
      fetchMock.mockResolvedValueOnce(fakeResponse(async () => STATS));

      await expect(apiGetPracticeStats()).resolves.toEqual(STATS);

      const requested = String(fetchMock.mock.calls[0]?.[0]);
      expect(requested.endsWith('/practice/stats?timeZone=Asia%2FKolkata')).toBe(true);
      spy.mockRestore();
    });

    it('falls back to UTC when Intl.DateTimeFormat throws', async () => {
      const spy = mockResolvedZone(undefined, { throws: true });
      fetchMock.mockResolvedValueOnce(fakeResponse(async () => STATS));

      await expect(apiGetPracticeStats()).resolves.toEqual(STATS);

      const requested = String(fetchMock.mock.calls[0]?.[0]);
      expect(requested.endsWith('/practice/stats?timeZone=UTC')).toBe(true);
      spy.mockRestore();
    });

    it('URL-encodes timezone strings containing reserved characters', async () => {
      const spy = mockResolvedZone('Foo/Bar Baz+&');
      fetchMock.mockResolvedValueOnce(fakeResponse(async () => STATS));

      await expect(apiGetPracticeStats()).resolves.toEqual(STATS);

      const requested = String(fetchMock.mock.calls[0]?.[0]);
      expect(requested.endsWith('/practice/stats?timeZone=Foo%2FBar%20Baz%2B%26')).toBe(true);
      expect(requested).not.toContain('timeZone=Foo/Bar');
      spy.mockRestore();
    });

    it('falls back to UTC for an empty or oversized resolved timezone', async () => {
      for (const timeZone of ['', 'x'.repeat(101)]) {
        const spy = mockResolvedZone(timeZone);
        fetchMock.mockClear();
        fetchMock.mockResolvedValueOnce(fakeResponse(async () => STATS));

        await expect(apiGetPracticeStats()).resolves.toEqual(STATS);
        expect(String(fetchMock.mock.calls[0]?.[0]).endsWith('/practice/stats?timeZone=UTC')).toBe(
          true,
        );
        spy.mockRestore();
      }
    });
  });

  // ------------------------------------------------- 5. deep-link param edges
  describe('deep-link parameter edge cases', () => {
    it('handles undefined and every array shape of a repeated parameter', () => {
      expect(firstParam(undefined)).toBeUndefined();
      expect(firstParam('single')).toBe('single');
      expect(firstParam([])).toBeUndefined();
      expect(firstParam(['only'])).toBe('only');
      expect(firstParam(['first', 'second', 'third'])).toBe('first');
      // The first value wins even when a later duplicate would be valid.
      const selected = firstParam(['not-a-uuid', QUESTION_ID]);
      expect(selected).toBe('not-a-uuid');
      expect(isUuid(selected)).toBe(false);
    });

    it('accepts uppercase and mixed-case UUIDs (the pattern is case-insensitive)', () => {
      expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(isUuid('550E8400-e29B-41d4-A716-446655440000')).toBe(true);
    });

    it('accepts a v1 (time-based) UUID', () => {
      expect(isUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(true);
      expect(isUuid('a0f7e6d4-3c2b-11ec-8fa1-080027513d4c')).toBe(true);
    });

    it('rejects the all-nil UUID via the version/variant constraints', () => {
      expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(false);
      // The zeros are not the rejector: valid version+variant nibbles pass.
      expect(isUuid('00000000-0000-1000-8000-000000000000')).toBe(true);
      // Version nibble must lie in [1-5]...
      expect(isUuid('550e8400-e29b-01d4-a716-446655440000')).toBe(false);
      expect(isUuid('550e8400-e29b-61d4-a716-446655440000')).toBe(false);
      // ...and the variant nibble in [89ab].
      expect(isUuid('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
      expect(isUuid('550e8400-e29b-41d4-7716-446655440000')).toBe(false);
    });

    // Literal mirror of the routed gate in src/app/practice/attempt.tsx; the
    // screen itself is deliberately not imported here.
    const ROUTED_ATTEMPTS_USED_PATTERN = /^[0-2]$/;
    const routedAttemptsUsed = (value: string | undefined): number | null =>
      value !== undefined && ROUTED_ATTEMPTS_USED_PATTERN.test(value) ? Number(value) : null;

    it.each([
      ['0', 0],
      ['1', 1],
      ['2', 2],
    ])('accepts the routed attemptsUsed value %p', (value, expected) => {
      expect(ROUTED_ATTEMPTS_USED_PATTERN.test(value)).toBe(true);
      expect(routedAttemptsUsed(value)).toBe(expected);
    });

    it.each(['3', '12', '', '02', ' 1', '1 ', '-1', '1.0', '+1', '０', 'a'])(
      'rejects the out-of-contract attemptsUsed value %p',
      (value) => {
        expect(ROUTED_ATTEMPTS_USED_PATTERN.test(value)).toBe(false);
        expect(routedAttemptsUsed(value)).toBeNull();
      },
    );

    it('maps an absent attemptsUsed parameter to null, never NaN', () => {
      expect(routedAttemptsUsed(undefined)).toBeNull();
    });
  });

  // ---------------------------------------------------- 6. replay identity
  describe('replay identity binding', () => {
    const question: Question = {
      id: QUESTION_ID,
      cefrLevel: 'B1',
      promptWord: 'courage',
      questionText: 'Describe a time you showed courage.',
    };

    function pendingFor(
      endpoint: PendingAssessment['endpoint'],
      overrides: Partial<PendingAssessment> = {},
    ): PendingAssessment {
      return {
        ...basePending,
        endpoint,
        ...(endpoint === '/diagnostic/answer' ? { cycleId: undefined } : {}),
        stage: 'feedback-pending',
        feedbackReadyAt: FEEDBACK_READY_AT,
        ...overrides,
      };
    }

    const practiceResponse = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    const nativeResponse = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'నేను ధైర్యంగా ఉన్నాను.',
      translatedTranscript: 'I was brave.',
      modelAnswer: 'I showed courage when I spoke up.',
      feedback: 'You understood the question.',
    };

    const diagnosticResponse = {
      passed: true,
      score: 88,
      transcript: 'I spoke up at work.',
      feedback: 'Clear answer.',
      done: false,
      nextQuestion: {
        id: NEXT_QUESTION_ID,
        cefrLevel: 'B2',
        promptWord: 'journey',
        questionText: 'Describe an important journey.',
      },
    };

    function completedPractice(overrides: Record<string, unknown> = {}) {
      return {
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
        response: { ...practiceResponse },
        ...overrides,
      };
    }

    it('binds matching identity for all three contexts', () => {
      expect(
        parseAssessmentReplayStatus(completedPractice(), pendingFor('/practice/attempt')),
      ).toMatchObject({ status: 'completed', context: 'practice', result: practiceResponse });

      expect(
        parseAssessmentReplayStatus(
          {
            status: 'completed',
            context: 'practice-native',
            questionId: QUESTION_ID,
            cycleId: CYCLE_ID,
            question,
            response: { ...nativeResponse },
          },
          pendingFor('/practice/attempt/native'),
        ),
      ).toMatchObject({ status: 'completed', context: 'practice-native', result: nativeResponse });

      const diagnostic = parseAssessmentReplayStatus(
        {
          status: 'completed',
          context: 'diagnostic',
          questionId: QUESTION_ID,
          cycleId: null,
          question,
          response: { ...diagnosticResponse },
        },
        pendingFor('/diagnostic/answer'),
      );
      expect(diagnostic).toMatchObject({
        status: 'completed',
        context: 'diagnostic',
        cycleId: null,
        result: diagnosticResponse,
      });
    });

    it.each([
      [
        'account context',
        (base: Record<string, unknown>) => ({ ...base, context: 'practice-native' }),
      ],
      [
        'account context omitted',
        (base: Record<string, unknown>) => ({ ...base, context: undefined }),
      ],
      ['question id', (base: Record<string, unknown>) => ({ ...base, questionId: OTHER_ID })],
      [
        'non-uuid question id',
        (base: Record<string, unknown>) => ({ ...base, questionId: 'not-a-uuid' }),
      ],
      [
        'practice cycle id',
        (base: Record<string, unknown>) => ({ ...base, cycleId: OTHER_CYCLE_ID }),
      ],
      [
        'practice cycle id dropped',
        (base: Record<string, unknown>) => ({ ...base, cycleId: null }),
      ],
      [
        'embedded question id',
        (base: Record<string, unknown>) => ({ ...base, question: { ...question, id: OTHER_ID } }),
      ],
      [
        'response cycle id',
        (base: Record<string, unknown>) => ({
          ...base,
          response: { ...practiceResponse, cycleId: OTHER_CYCLE_ID },
        }),
      ],
    ])('rejects a completed response mismatching the pending %s', (_label, patch) => {
      expect(() =>
        parseAssessmentReplayStatus(
          patch(completedPractice() as unknown as Record<string, unknown>),
          pendingFor('/practice/attempt'),
        ),
      ).toThrow(ContractError);
    });

    it('rejects a response mismatching the pending record in every dimension at once', () => {
      expect(() =>
        parseAssessmentReplayStatus(
          {
            status: 'completed',
            context: 'practice-native',
            questionId: OTHER_ID,
            cycleId: OTHER_CYCLE_ID,
            question: { ...question, id: OTHER_ID },
            response: { ...practiceResponse, cycleId: OTHER_CYCLE_ID },
          },
          pendingFor('/practice/attempt'),
        ),
      ).toThrow(ContractError);
    });

    it('rejects a cross-context replay: diagnostic cycle against a practice pending record', () => {
      expect(() =>
        parseAssessmentReplayStatus(
          {
            status: 'completed',
            context: 'diagnostic',
            questionId: QUESTION_ID,
            cycleId: null,
            question,
            response: { ...diagnosticResponse },
          },
          pendingFor('/practice/attempt'),
        ),
      ).toThrow(ContractError);
    });

    it('rejects English-shaped feedback replayed against a native pending record', () => {
      expect(() =>
        parseAssessmentReplayStatus(
          {
            status: 'completed',
            context: 'practice-native',
            questionId: QUESTION_ID,
            cycleId: CYCLE_ID,
            question,
            response: { ...practiceResponse },
          },
          pendingFor('/practice/attempt/native'),
        ),
      ).toThrow(ContractError);
    });

    it('accepts a processing response without any response field', () => {
      for (const endpoint of [
        '/diagnostic/answer',
        '/practice/attempt',
        '/practice/attempt/native',
      ] as const) {
        const context =
          endpoint === '/diagnostic/answer'
            ? 'diagnostic'
            : endpoint === '/practice/attempt/native'
              ? 'practice-native'
              : 'practice';
        const parsed = parseAssessmentReplayStatus(
          {
            status: 'processing',
            context,
            questionId: QUESTION_ID,
            ...(endpoint === '/diagnostic/answer' ? { cycleId: null } : { cycleId: CYCLE_ID }),
            question,
          },
          pendingFor(endpoint),
        );
        expect(parsed.status).toBe('processing');
        expect(parsed).not.toHaveProperty('result');
      }
    });

    it.each([null, {}, { status: undefined }, { status: 'failed' }, { status: 'queued' }])(
      'rejects an unknown or absent status %#',
      (value) => {
        expect(() => parseAssessmentReplayStatus(value, pendingFor('/practice/attempt'))).toThrow(
          ContractError,
        );
      },
    );
  });
});
