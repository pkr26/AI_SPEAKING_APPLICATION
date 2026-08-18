import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, BackHandler, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import AttemptScreen from '../src/app/practice/attempt';
import FeedbackScreen from '../src/app/practice/feedback';
import HelpScreen from '../src/app/practice/help';
import PracticeScreen from '../src/app/practice/index';
import { ApiError, apiFetch, apiSkipPracticeWord } from '../src/lib/api';
import { LogoutCleanupError, useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
import {
  parseAttemptResult,
  parseNativeAttemptResult,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_PASS_SCORE,
  type AttemptResult,
  type NativeAttemptResult,
  type PracticeOutcome,
  type PracticeQuestionPayload,
  type Question,
  type User,
} from '../src/lib/types';

// Under jest no I18nProvider is mounted, so screens fall back to English;
// assert against the same typed catalog the screens render from.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const asMock = (fn: unknown) => fn as jest.Mock;

// ----- color scheme -----

// Practice screens render in the light palette unless a test flips the OS
// scheme; the dark palette carries its own elevation and fill decisions.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

// ----- expo-router mock -----

let mockSearchParams: Record<string, string | string[] | undefined> = {};
const mockSetOptions = jest.fn();

// Focus is simulated by invoking the effect on mount and its cleanup on
// unmount, re-running when the callback identity changes (as expo-router does
// while a screen stays focused).
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useLocalSearchParams: () => mockSearchParams,
    useNavigation: () => ({ setOptions: mockSetOptions }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

// ----- expo-haptics mock (no native module under jest) -----

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

// ----- Recorder stub -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  endpoint: string;
  parseResult: (data: unknown) => PracticeOutcome;
  onResult: (data: PracticeOutcome) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onRateLimited?: (message: string) => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
}

let mockRecorderProps: CapturedRecorderProps | null = null;

// A host node stands in for the real recorder so tests can reach the slot the
// screens reserve for it (`styles.recorderArea`) the same way a user's eye does.
function MockRecorder(props: CapturedRecorderProps) {
  React.useEffect(() => {
    mockRecorderProps = props;
  });
  return <View testID="recorder" />;
}

jest.mock('../src/components/Recorder', () => ({
  __esModule: true,
  default: MockRecorder,
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let mockAuthValue: AuthValue;

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

// ----- practice flow mock -----

type PracticeFlowValue = ReturnType<typeof usePracticeFlow>;

let mockPracticeFlow: PracticeFlowValue;

function makePracticeFlow(overrides: Partial<PracticeFlowValue> = {}): PracticeFlowValue {
  return {
    answerMode: 'english',
    feedback: null,
    attemptStatus: null,
    sessionTally: { attempts: 0, passed: 0, mastered: 0, levelUps: 0 },
    setAnswerMode: jest.fn(),
    showFeedback: jest.fn(),
    clearFeedback: jest.fn(),
    resetSessionTally: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
  usePracticeFlow: () => mockPracticeFlow,
}));

// ----- practice intro mock (SecureStore-backed first-visit explainer) -----

jest.mock('../src/lib/practice-intro', () => ({
  hasSeenPracticeIntro: jest.fn(async () => true),
  markPracticeIntroSeen: jest.fn(async () => undefined),
}));

const mockPracticeIntro = jest.requireMock('../src/lib/practice-intro') as {
  hasSeenPracticeIntro: jest.Mock;
  markPracticeIntroSeen: jest.Mock;
};

// ----- api mock -----

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
  apiSkipPracticeWord: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;
const mockSkipWord = apiSkipPracticeWord as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  dismissTo: jest.Mock;
};

// ----- fixtures -----

const QUESTION: Question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
};

const NEXT_QUESTION: Question = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  cefrLevel: 'B1',
  promptWord: 'journey',
  questionText: 'Tell me about a memorable journey.',
};

const HELP_CONTENT = {
  promptWord: 'courage',
  promptWordNative: 'ధైర్యం',
  questionText: 'Describe a time you showed courage.',
  questionTextNative: 'మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.',
  examples: [
    { en: 'She showed courage at work.', native: 'ఆమె పనిలో ధైర్యం చూపింది.' },
    {
      en: 'It takes courage to speak up.',
      native: 'మాట్లాడటానికి ధైర్యం కావాలి.',
    },
    {
      en: 'Courage grows with practice.',
      native: 'అభ్యాసంతో ధైర్యం పెరుగుతుంది.',
    },
  ],
};

const PRACTICE_QUESTION: PracticeQuestionPayload = {
  question: QUESTION,
  kind: 'new',
  progress: { masteredCount: 2, learningCount: 1, totalAtLevel: 8 },
};

const NEXT_PRACTICE_QUESTION: PracticeQuestionPayload = {
  question: NEXT_QUESTION,
  kind: 'new',
  progress: { masteredCount: 3, learningCount: 1, totalAtLevel: 8 },
};

const PASSED_RESULT: AttemptResult = {
  passed: true,
  mastered: false,
  attemptNo: 1,
  score: 72,
  transcript: 'I enjoy reading.',
  feedback: 'Nice work.',
  next: NEXT_PRACTICE_QUESTION,
};

// ----- helpers -----

let alertSpy: jest.SpyInstance;
let backHandlers: (() => boolean)[];
let backSubscriptionRemove: jest.Mock;

function pressHardwareBack(): boolean {
  if (backHandlers.length === 0) throw new Error('No hardware back handler registered');
  return backHandlers[backHandlers.length - 1]();
}

const queryClients: QueryClient[] = [];

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

function withProviders(ui: React.ReactElement, client: QueryClient, bottomInset: number) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: bottomInset },
      }}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

function renderScreen(ui: React.ReactElement, queryClient?: QueryClient, bottomInset = 0) {
  return render(withProviders(ui, queryClient ?? makeQueryClient(), bottomInset));
}

/**
 * Renders a screen and hands back a re-render that keeps the same providers and
 * the same mounted instance, so a test can change what the mocked hooks return
 * — a switched account, a fresh outcome — without a remount papering over it.
 */
async function renderRerenderable(ui: React.ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  const view = await render(withProviders(ui, client, 0));
  return (next: React.ReactElement) => view.rerender(withProviders(next, client, 0));
}

function recorderProps(): CapturedRecorderProps {
  if (!mockRecorderProps) throw new Error('Recorder was not rendered');
  return mockRecorderProps;
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

async function expectPressFeedback(
  getButton: () => TestInstance,
  resting: SemanticStyle,
  pressed: SemanticStyle,
): Promise<void> {
  expect(flattenedStyle(getButton())).toMatchObject(resting);
  await fireEvent(getButton(), 'responderGrant', responderEvent());
  expect(flattenedStyle(getButton())).toMatchObject(pressed);
  await fireEvent(getButton(), 'responderTerminate', responderEvent());
  await waitFor(() => {
    const restored = flattenedStyle(getButton());
    expect(restored).toMatchObject(resting);
    for (const property of Object.keys(pressed)) {
      if (!(property in resting)) expect(restored[property]).toBeUndefined();
    }
  });
}

/** The host view a control is laid out in (card, badge row, bar, footer). */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

/**
 * ScrollView renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function scrollView(): TestInstance {
  const [node] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
  if (!node) throw new Error('No ScrollView rendered');
  return node;
}

function scrollContentStyle(): SemanticStyle {
  return StyleSheet.flatten(scrollView().props.contentContainerStyle) ?? {};
}

/** The full-bleed backdrop the scrolling content sits on. */
function screenContainerStyle(): SemanticStyle {
  return flattenedStyle(parentOf(scrollView()));
}

/** The reserved slot the recorder is mounted into. */
function recorderAreaStyle(): SemanticStyle {
  return flattenedStyle(parentOf(screen.getByTestId('recorder')));
}

function buttonContainerPaddingBottom(name: string): unknown {
  const parent = screen.getByRole('button', { name }).parent;
  if (!parent) throw new Error(`Button "${name}" has no container`);
  return StyleSheet.flatten(parent.props.style)?.paddingBottom;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Module factory mocks outlive clearAllMocks; re-arm the light default.
  asMock(useColorScheme).mockReset();
  asMock(useColorScheme).mockReturnValue('light');
  mockApiFetch.mockReset();
  mockSkipWord.mockReset();
  mockRecorderProps = null;
  mockSearchParams = {};
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
  // Default to "already seen" so the explainer card stays out of every test
  // that is not explicitly about it.
  mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(true);
  mockPracticeIntro.markPracticeIntroSeen.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  backHandlers = [];
  backSubscriptionRemove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: backSubscriptionRemove };
  });
});

afterEach(async () => {
  // Flush TanStack Query's batched notifications inside act().
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // Cancel cache-gc timers so the jest process can exit promptly.
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
  alertSpy.mockRestore();
});

describe('practice home screen', () => {
  it('shows a loading state while the question loads', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />);
    expect(screen.getByText(t('practice.loadingQuestion'))).toBeTruthy();
    expect(screen.getByText(t('practice.greeting', { name: USER.name }))).toBeTruthy();
  });

  it('keeps footer actions above a larger device safe-area inset', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />, undefined, 34);

    expect(buttonContainerPaddingBottom(t('practice.settings'))).toBe(34);
  });

  it('renders the question and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText('B1')).toBeTruthy();
    // The plain-language CEFR explainer sits under the badge row.
    expect(screen.getByText(t('cefr.B1'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/practice/question',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION.id,
      endpoint: '/practice/attempt',
    });
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['practice-question', USER.id, USER.cefrLevel],
        exact: true,
      }),
    ).toBeDefined();
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['practice-question', USER.id, USER.cefrLevel],
        exact: true,
      })?.options,
    ).toEqual(expect.objectContaining({ enabled: true, retry: false, staleTime: Infinity }));
  });

  it('shows the new-word badge and progress line for a fresh word', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.newWord'))).toBeTruthy();
    expect(
      screen.getByText(
        t('practice.progressLine', { mastered: 2, total: 8 }) +
          t('practice.progressLearning', { count: 1 }),
      ),
    ).toBeTruthy();
  });

  it('shows the mastery explainer card on the first practice visit', async () => {
    mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();
    expect(mockPracticeIntro.hasSeenPracticeIntro).toHaveBeenCalledWith(USER.id);
    expect(
      screen.getByText(t('practiceIntro.master', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(
      screen.getByText(t('practiceIntro.tries', { count: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('practiceIntro.silence'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('practiceIntro.dismiss') }));

    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
    expect(mockPracticeIntro.markPracticeIntroSeen).toHaveBeenCalledWith(USER.id);
  });

  it('never shows the mastery explainer to a learner who has already seen it', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    // Let the stored-flag read resolve before asserting the card stayed away.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
    expect(mockPracticeIntro.markPracticeIntroSeen).not.toHaveBeenCalled();
  });

  it('shows the review badge and hides a zero review count', async () => {
    mockApiFetch.mockResolvedValue({
      question: QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.revision'))).toBeTruthy();
    expect(screen.getByText(t('practice.progressLine', { mastered: 4, total: 12 }))).toBeTruthy();
    expect(screen.queryByText(/to review/)).toBeNull();
  });

  it('starts in English and requests native mode from the language toggle', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.answerInMyLanguage'))).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt');
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: false });

    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt/native')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('native');
    expect(recorderProps().onRecoveryEndpointMismatch?.('/diagnostic/answer')).toBe(false);
  });

  it('wires native mode to its isolated endpoint and can request English mode', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.answeringNative'))).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult).toBe(parseNativeAttemptResult);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: true, disabled: false });
    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('english');
  });

  it('gives the language switch a touch-safe target and outlined off state', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(toggle).backgroundColor).toBeUndefined();
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toMatchObject({
      color: colors.primary,
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { borderColor: colors.primary },
      { backgroundColor: colors.primaryLight },
    );
  });

  it('fills the language switch with contrast-checked text when native mode is on', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      backgroundColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answeringNative')))).toMatchObject({
      color: '#FFFFFF',
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('shows the attempt chip when the current word has a known retry state', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, attemptsLeft: 2 },
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(
      screen.getByText(t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
  });

  it('derives the upcoming attempt number from the remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, attemptsLeft: 1 },
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(
      screen.getByText(t('practice.attemptChip', { current: 3, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
  });

  it.each([
    ['no attempt state is known', null],
    ['the retry state belongs to another word', { questionId: NEXT_QUESTION.id, attemptsLeft: 2 }],
  ])('hides the attempt chip when %s', async (_case, attemptStatus) => {
    mockPracticeFlow = makePracticeFlow({ attemptStatus });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.queryByText(/^Try \d of \d$/)).toBeNull();
  });

  it('locks the language switch while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
    await fireEvent.press(toggle);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('locks help and footer actions while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const help = screen.getByLabelText(t('practice.helpLabel'));
    expect(help.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(help)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(help);
    expect(mockRouter.push).not.toHaveBeenCalled();

    const settings = screen.getByRole('button', { name: t('practice.settings') });
    expect(settings.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(settings)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(settings);
    expect(alertSpy).not.toHaveBeenCalled();

    const logout = screen.getByRole('button', { name: t('common.logOut') });
    expect(logout.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(logout)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(logout);
    expect(mockAuthValue.logout).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel'))).opacity).toBeUndefined();
    await fireEvent.press(screen.getByLabelText(t('practice.helpLabel')));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('blocks Android hardware back only while the recorder holds the interaction lock', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const view = await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    // Practice sits above Home now: an idle screen lets the navigator pop back.
    expect(pressHardwareBack()).toBe(false);
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(pressHardwareBack()).toBe(true);
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(pressHardwareBack()).toBe(false);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await view.unmount();
    expect(backSubscriptionRemove).toHaveBeenCalled();
  });

  it('hides header back and the iOS gesture only while the recorder is locked', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
  });

  it('does not load or mount a recorder without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });

    await renderScreen(<PracticeScreen />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText(t('practice.loadingQuestion'))).toBeNull();
    // The stored explainer flag is keyed by account: with no account there is
    // no key to read, so the effect must not reach storage at all.
    expect(mockPracticeIntro.hasSeenPracticeIntro).not.toHaveBeenCalled();
  });

  it('forwards recorder results to the practice flow and feedback route', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, PASSED_RESULT);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('updates a cached new word to revision after a real scored miss', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    await waitFor(() => expect(screen.getByText(t('practice.revision'))).toBeTruthy());
    expect(
      screen.getByText(
        t('practice.progressLine', { mastered: 2, total: 8 }) +
          t('practice.progressLearning', { count: 2 }),
      ),
    ).toBeTruthy();
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, miss);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('does not double-count a scored miss for a word already in revision', async () => {
    const revision = {
      ...PRACTICE_QUESTION,
      kind: 'revision' as const,
    };
    mockApiFetch.mockResolvedValue(revision);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 50,
      transcript: 'I tried again.',
      feedback: 'Add another supporting detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      revision,
    );
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'upload failed');
  });

  it('refetches the question when recorder recovery is unresolved', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps a cached question visible when a recovery refresh fails', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockRejectedValueOnce(new Error('background refresh failed'));
    await renderScreen(<PracticeScreen />, queryClient);
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();

    await act(async () => recorderProps().onRecoveryUnresolved());
    await waitFor(() => expect(queryClient.getQueryState(queryKey)?.status).toBe('error'));
    // The cache updates before TanStack Query delivers its batched observer notification.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('practice.loadFailedTitle'))).toBeNull();
  });

  it('navigates to help for the current question', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await expectPressFeedback(
      () => screen.getByLabelText(t('practice.helpLabel')),
      {
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        height: layout.minimumTarget,
        justifyContent: 'center',
        width: layout.minimumTarget,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByLabelText(t('practice.helpLabel')));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the practice fallback without also showing a loading state', async () => {
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.loadFailed'))).toBeTruthy();
    expect(screen.queryByText(t('practice.loadingQuestion'))).toBeNull();
  });

  it('navigates to the settings screen instead of an Alert menu', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: t('practice.settings') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('logs out and returns to the gate', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalled();
  });

  it('reports a cleanup failure after logout', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new LogoutCleanupError()),
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('logout.cleanupTitle'),
        t('auth.logoutCleanupFailed'),
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('reports a generic logout failure', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('offline')),
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(t('logout.failedTitle'), t('logout.failedBody')),
    );
  });
});

describe('practice attempt screen', () => {
  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<AttemptScreen />);

    expect(screen.getByText(t('help.invalidLinkTitle'))).toBeTruthy();
    // Practice Mode sends the learner back a different way than help does.
    expect(screen.getByText(t('attempt.invalidLinkBody'))).toBeTruthy();
    expect(screen.queryByText(t('help.invalidLinkBody'))).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.backToPractice') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.backToPractice') }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a loading state while the question loads', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<AttemptScreen />);
    expect(screen.getByText(t('attempt.loading'))).toBeTruthy();
    // The spinner itself is labelled, so the wait is announced without sight.
    expect(screen.getByLabelText(t('attempt.loading'))).toBeTruthy();
  });

  it('renders the question and wires the recorder for the attempt endpoint', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    await renderScreen(<AttemptScreen />, queryClient);

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/practice/question/${QUESTION.id}/help`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION.id,
      endpoint: '/practice/attempt',
    });
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
        exact: true,
      }),
    ).toBeDefined();
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
        exact: true,
      })?.options,
    ).toEqual(expect.objectContaining({ enabled: true, retry: false }));
    // Practice Mode deliberately hides translations and examples.
    expect(screen.queryByText('ధైర్యం')).toBeNull();
    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt/native')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('preserves native mode when practice is entered from help', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.answeringNative'))).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult).toBe(parseNativeAttemptResult);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: true, disabled: false });

    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'నాకు ప్రయాణం ఇష్టం.',
      modelAnswer: 'I enjoy travelling because I discover new places.',
      feedback: 'Your answer was on topic.',
    };
    await act(async () => recorderProps().onResult(nativeResult));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, nativeResult);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');

    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('english');
    expect(recorderProps().onRecoveryEndpointMismatch?.('/diagnostic/answer')).toBe(false);
  });

  it('locks the help-entry language switch during recording and submission', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
    // The lock is explained, not just enforced, and it is visible as dimming.
    expect(toggle.props.accessibilityHint).toBe(t('hint.finishRecordingFirst'));
    expect(flattenedStyle(toggle)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(toggle);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    const unlocked = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(unlocked.props.accessibilityHint).toBeUndefined();
    expect(flattenedStyle(unlocked).opacity).toBeUndefined();
    await fireEvent.press(unlocked);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('blocks the Android hardware back press only while a recording or submission is active', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(pressHardwareBack()).toBe(false);

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(pressHardwareBack()).toBe(true);

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(pressHardwareBack()).toBe(false);
  });

  it('hides header back and disables the swipe gesture while the recorder is locked', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    // Unlocked screens keep their normal exits.
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
  });

  it('fills the language switch with contrast-checked text when native mode is on', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      backgroundColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answeringNative')))).toMatchObject({
      color: '#FFFFFF',
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('keeps the outlined off state with a touch-safe target', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(toggle).backgroundColor).toBeUndefined();
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toMatchObject({
      color: colors.primary,
    });
  });

  it('shows the attempt chip for the question the retry state belongs to', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, attemptsLeft: 2 },
    });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(
      screen.getByText(t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
  });

  it.each([
    ['no attempt state is known', null],
    ['the retry state belongs to another word', { questionId: NEXT_QUESTION.id, attemptsLeft: 2 }],
  ])('hides the attempt chip when %s', async (_case, attemptStatus) => {
    mockPracticeFlow = makePracticeFlow({ attemptStatus });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.queryByText(/^Try \d of \d$/)).toBeNull();
  });

  it('does not load help or mount a recorder without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockSearchParams = { questionId: QUESTION.id };

    await renderScreen(<AttemptScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText(t('attempt.loading'))).toBeNull();
  });

  it.each([
    ['the prompt word', { ...HELP_CONTENT, promptWord: '' }],
    ['the question text', { ...HELP_CONTENT, questionText: '' }],
  ])('does not mount the recorder when help omits %s', async (_label, content) => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    const queryKey = ['question-help', USER.id, USER.nativeLanguage, QUESTION.id] as const;
    // Exercise the screen's defense against corrupt cached data independently
    // of the API parser, which rejects these shapes before caching them.
    queryClient.setQueryDefaults(queryKey, { staleTime: Infinity });
    queryClient.setQueryData(queryKey, content);

    await renderScreen(<AttemptScreen />, queryClient);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText('courage')).toBeNull();
    expect(screen.queryByText(t('attempt.loadFailedTitle'))).toBeNull();
  });

  it('forwards results to the practice flow and feedback route', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, PASSED_RESULT);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('updates a cached new word to revision after a real scored miss', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, miss);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('does not double-count a scored miss for a word already in revision', async () => {
    const revision = {
      ...PRACTICE_QUESTION,
      kind: 'revision' as const,
    };
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], revision);
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 50,
      transcript: 'I tried again.',
      feedback: 'Add another supporting detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      revision,
    );
  });

  it('surfaces attempt recorder errors through an alert', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('microphone upload failed'));

    expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'microphone upload failed');
  });

  it('keeps cached attempt content visible during a background refresh', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      HELP_CONTENT,
    );
    mockApiFetch.mockReturnValue(new Promise(() => undefined));

    await renderScreen(<AttemptScreen />, queryClient);

    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('attempt.loading'))).toBeNull();
    expect(recorderProps().questionId).toBe(QUESTION.id);
  });

  it('invalidates the practice question and exits when recovery is unresolved', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onRecoveryUnresolved());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    // Practice Mode is entered from help, so replacing only this route would
    // strand that help screen under a second live Practice screen.
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<AttemptScreen />);

    expect(await screen.findByText(t('attempt.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the attempt-specific fallback for non-API failures', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<AttemptScreen />);

    expect(await screen.findByText(t('attempt.loadFailed'))).toBeTruthy();
  });
});

describe('practice feedback screen', () => {
  it('handles missing feedback with a way back to practice', async () => {
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.noResultTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.noResultBody'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.backToPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.backToPractice') }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
  });

  it('renders the passed variant and seeds the next question', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.passedBody', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.scoreLine', { score: 72 }))).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText('“I enjoy reading.”')).toBeTruthy();
    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Nice work.')).toBeTruthy();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText(t('feedback.finalTitle'))).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    // A scored English pass owns the bottom bar alone: the native-answer
    // actions belong to native outcomes only.
    expect(screen.queryByText(t('feedback.tryInEnglish'))).toBeNull();
    expect(screen.queryByText(t('feedback.tryAgainNative'))).toBeNull();
    // Only mastery and a promotion earn the physical cheer.
    expect(jest.mocked(Haptics.notificationAsync)).not.toHaveBeenCalled();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.passedTitle') })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('feedback.nextQuestion') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the mastered variant and seeds the next question', async () => {
    const masteredResult: AttemptResult = {
      passed: true,
      mastered: true,
      attemptNo: 1,
      score: 88,
      transcript: 'I spoke up at work.',
      feedback: 'Confident and clear.',
      next: NEXT_PRACTICE_QUESTION,
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: masteredResult },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText(t('feedback.masteredTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.masteredBody', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.scoreLine', { score: 88 }))).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    // Mastery celebrates with a success haptic; other variants stay silent.
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
    expect(screen.getByText('Confident and clear.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.masteredTitle') })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with the model answer when understood', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.nativeUnderstoodTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeUnderstoodBody'))).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”')).toBeTruthy();
    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('You understood the question.')).toBeTruthy();
    expect(screen.getByText(t('feedback.sayInEnglish'))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”').props.accessibilityLanguage).toBe(
      'te-IN',
    );
    // Native results carry no score and never advance the word queue.
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.nativeUnderstoodTitle') })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.tryInEnglish') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with a model answer when the answer missed the question', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: false,
      transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'That answer was about travel, not courage.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.nativeMissedTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeMissedBody'))).toBeTruthy();
    expect(screen.getByText('That answer was about travel, not courage.')).toBeTruthy();
    expect(screen.getByText(t('feedback.sayInEnglish'))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.nativeUnderstoodTitle'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.nativeMissedTitle') })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });
    expect(screen.getByRole('button', { name: t('feedback.tryInEnglish') })).toBeTruthy();
  });

  it('renders native silence as a free retry that preserves native mode', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: false,
      transcript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeNoSpeechBody'))).toBeTruthy();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.weHeard'))).toBeNull();
    expect(screen.queryByText(t('feedback.sayInEnglish'))).toBeNull();
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    // Silence is not a judged answer: neither native verdict may appear.
    expect(screen.queryByText(t('feedback.nativeUnderstoodTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.nativeMissedTitle'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.noSpeechTitle') })),
    ).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.warning,
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.tryAgainNative') }));
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the nospeech variant with Try Again and help actions', async () => {
    const noSpeechResult: AttemptResult = {
      passed: false,
      mastered: false,
      noSpeech: true,
      attemptNo: 1,
      attemptsLeft: 3,
      score: 0,
      transcript: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: noSpeechResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.noSpeechBody'))).toBeTruthy();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    // Silence carries no score or transcript and does not advance the queue.
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    expect(screen.queryByText(t('feedback.weHeard'))).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.noSpeechTitle') })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('opens help from the nospeech variant', async () => {
    const noSpeechResult: AttemptResult = {
      passed: false,
      mastered: false,
      noSpeech: true,
      attemptNo: 1,
      attemptsLeft: 3,
      score: 0,
      transcript: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: noSpeechResult },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.seeHelp') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('keeps feedback actions above a larger device safe-area inset', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />, undefined, 34);

    expect(buttonContainerPaddingBottom(t('feedback.nextQuestion'))).toBe(34);
  });

  it('invalidates the practice question when no next question is provided', async () => {
    const { next: _next, ...result } = PASSED_RESULT;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the retry variant with remaining attempts and Try Again', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 2,
          attemptsLeft: 1,
          score: 40,
          transcript: 'I tried to answer.',
          feedback: 'Keep practicing.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(
      screen.getByText(t('feedback.retryTitle', { attempt: 3, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.retryBodyOne'))).toBeTruthy();
    expect(screen.getByText(t('feedback.scoreLine', { score: 40 }))).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText('Keep practicing.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.finalTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(
      flattenedStyle(
        screen.getByRole('header', {
          name: t('feedback.retryTitle', { attempt: 3, max: PRACTICE_MAX_ATTEMPTS }),
        }),
      ),
    ).toMatchObject({ color: colors.warning, textAlign: 'center' });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('pluralizes remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 55,
          transcript: 'some words',
          feedback: 'Almost there.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(
      screen.getByText(t('feedback.retryTitle', { attempt: 2, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.retryBodyMany', { count: 2 }))).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
  });

  it('renders the final variant with final feedback', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
          finalFeedback: 'Final words.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.finalTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.finalBody'))).toBeTruthy();
    expect(screen.getByText(t('feedback.finalFeedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Final words.')).toBeTruthy();
    expect(screen.queryByText('Regular feedback.')).toBeNull();
    expect(screen.getByRole('button', { name: t('feedback.nextQuestion') })).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.finalTitle') })),
    ).toMatchObject({
      color: colors.danger,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('feedback.nextQuestion') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('ignores unexpected final feedback outside the final variant', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          ...PASSED_RESULT,
          feedback: 'Normal passed feedback.',
          finalFeedback: 'Must not be displayed.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Normal passed feedback.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.finalFeedbackLabel'))).toBeNull();
    expect(screen.queryByText('Must not be displayed.')).toBeNull();
  });

  it('does not navigate when the user is missing', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('advances via the seeded next question when hardware back follows a pass', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('invalidates the practice question when hardware back ends the final attempt', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
        },
      },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it.each([
    [
      'a retry result',
      {
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 40,
        transcript: 'I tried to answer.',
        feedback: 'Keep practicing.',
      } satisfies AttemptResult,
    ],
    [
      'a nospeech result',
      {
        passed: false,
        mastered: false,
        noSpeech: true,
        attemptNo: 1,
        attemptsLeft: 3,
        score: 0,
        transcript: '',
        feedback: 'We could not detect any speech.',
      } satisfies AttemptResult,
    ],
  ])('treats hardware back as the free retry for %s', async (_label, result) => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('treats hardware back as Try in English on the native variant', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('keeps native mode when hardware back follows native silence', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: false,
      transcript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    // Silence never consumed the word, so the queue must not be advanced or
    // re-fetched behind the learner's back.
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
  });

  it('routes hardware back to practice when there is no result to show', async () => {
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('hides the decorative emoji from screen readers on every variant', async () => {
    const cases: [PracticeOutcome, string][] = [
      [PASSED_RESULT, '🎉'],
      [{ ...PASSED_RESULT, mastered: true, score: 88 }, '🏆'],
      [
        {
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
        '💪',
      ],
      [
        {
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Final.',
        },
        '📘',
      ],
      [
        {
          passed: false,
          mastered: false,
          noSpeech: true,
          attemptNo: 1,
          attemptsLeft: 3,
          score: 0,
          transcript: '',
          feedback: 'We could not detect any speech.',
        },
        '🎤',
      ],
      [
        {
          mode: 'native',
          understood: true,
          transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'On topic.',
        },
        '🌏',
      ],
      [
        {
          mode: 'native',
          understood: false,
          transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'Off topic.',
        },
        '🧩',
      ],
      [
        {
          mode: 'native',
          understood: false,
          transcript: '',
          modelAnswer: '',
          feedback: 'We could not detect any speech.',
        },
        '🎤',
      ],
    ];
    for (const [result, emoji] of cases) {
      mockPracticeFlow = makePracticeFlow({ feedback: { questionId: QUESTION.id, result } });
      const view = await renderScreen(<FeedbackScreen />);

      // Hidden from screen readers means hidden from default queries too.
      expect(screen.queryByText(emoji)).toBeNull();
      expect(screen.getByText(emoji, { includeHiddenElements: true }).props).toMatchObject({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      });
      await view.unmount();
    }
  });

  it('scopes the polite live region to the outcome headline and score block', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    const header = screen.getByRole('header', { name: t('feedback.passedTitle') });
    const liveHeader = header.parent;
    if (!liveHeader) throw new Error('Feedback headline has no live-region container');
    expect(liveHeader.props.accessibilityLiveRegion).toBe('polite');
    // The score announces itself with the headline…
    expect(screen.getByText(t('feedback.scoreLine', { score: 72 })).parent).toBe(liveHeader);
    // …while the transcript/feedback card stays out of the live region.
    const card = screen.getByText('Nice work.').parent;
    expect(card?.props.accessibilityLiveRegion).toBeUndefined();
  });

  it('ignores a second tap on Try Again before navigation completes', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('ignores a second tap on Next Question before navigation completes', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const setDataSpy = jest.spyOn(queryClient, 'setQueryData');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(setDataSpy).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('lets hardware back reuse the one-shot action guard with the primary button', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    await act(async () => {
      pressHardwareBack();
    });

    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('keeps the outcome on screen while the router pops the card away', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);

    // Clearing the flow state re-renders this card before the pop finishes;
    // the learner must see it slide away, not a spurious failure notice.
    mockPracticeFlow = makePracticeFlow({ feedback: null });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
    expect(screen.getByText('Nice work.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.noResultTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.noResultBody'))).toBeNull();
  });
});

describe('practice help screen', () => {
  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    expect(screen.getByText(t('help.invalidLinkTitle'))).toBeTruthy();
    // Help sends the learner back through the question they came from.
    expect(screen.getByText(t('help.invalidLinkBody'))).toBeTruthy();
    expect(screen.queryByText(t('attempt.invalidLinkBody'))).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.backToPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.backToPractice') }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a loading state while help loads', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<HelpScreen />);
    expect(screen.getByText(t('help.loading'))).toBeTruthy();
    // The spinner itself is labelled, so the wait is announced without sight.
    expect(screen.getByLabelText(t('help.loading'))).toBeTruthy();
    expect(screen.queryByText(t('help.loadFailedTitle'))).toBeNull();
  });

  it('renders the word, question, and bilingual examples', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    await renderScreen(<HelpScreen />, queryClient);

    expect(await screen.findByText(t('label.word'))).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText('ధైర్యం')).toBeTruthy();
    expect(screen.getByText(t('label.question'))).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.')).toBeTruthy();
    expect(screen.getByText(t('help.examplesLabel'))).toBeTruthy();
    expect(screen.getByText(t('help.exampleNumber', { number: 1 }))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.')).toBeTruthy();
    expect(screen.getByText(t('help.exampleNumber', { number: 2 }))).toBeTruthy();
    expect(screen.getByText('It takes courage to speak up.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/practice/question/${QUESTION.id}/help`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(screen.getByText('ధైర్యం').props.accessibilityLanguage).toBe('te-IN');
    expect(
      screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.').props.accessibilityLanguage,
    ).toBe('te-IN');
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.').props.accessibilityLanguage).toBe('te-IN');
    const helpQuery = queryClient.getQueryCache().find({
      queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      exact: true,
    });
    expect(helpQuery).toBeDefined();
    expect(helpQuery?.options).toEqual(expect.objectContaining({ staleTime: 60 * 60_000 }));
  });

  it('keeps the practice action above a larger device safe-area inset', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />, undefined, 34);
    await screen.findByText(t('label.word'));

    expect(buttonContainerPaddingBottom(t('help.startPractice'))).toBe(34);
  });

  it('does not load help without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockSearchParams = { questionId: QUESTION.id };

    await renderScreen(<HelpScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(t('label.word'))).toBeNull();
    expect(screen.queryByText(t('help.loading'))).toBeNull();
  });

  it.each([
    ['hi', 'hi-IN'],
    ['es', 'es-ES'],
    ['zh', 'zh-Hans'],
  ] as const)('uses the %s learner language for native help text', async (language, tag) => {
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: language } });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);

    expect((await screen.findByText('ధైర్యం')).props.accessibilityLanguage).toBe(tag);
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.').props.accessibilityLanguage).toBe(tag);
  });

  it('navigates to practice mode for the same question', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText(t('label.word'));

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('help.startPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('help.startPractice') }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/attempt',
      params: { questionId: QUESTION.id },
    });
  });

  it('shows a retryable error when help fails to load', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText(t('help.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the help-specific fallback for non-API failures', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText(t('help.loadFailed'))).toBeTruthy();
    expect(screen.queryByText(t('help.loading'))).toBeNull();
  });

  it('keeps the help content alone when a background refresh fails', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      HELP_CONTENT,
    );
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />, queryClient);
    expect(screen.getByText(t('label.word'))).toBeTruthy();

    // Practice Mode shares this query key with a far shorter staleTime, so a
    // focus-driven refetch can fail while this screen still holds content.
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      });
    });

    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByRole('button', { name: t('help.startPractice') })).toBeTruthy();
    // The retry card must not stack above the help the learner is reading.
    expect(screen.queryByText(t('help.loadFailedTitle'))).toBeNull();
    expect(screen.queryByText(t('error.serverBusy'))).toBeNull();
    expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
  });
});

describe('skip word', () => {
  it('skips the current word and fetches the next question', async () => {
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
    mockSkipWord.mockResolvedValue(undefined);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id);
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('disables skipping while the recorder holds the interaction lock', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const skip = screen.getByRole('button', { name: t('practice.skipWord') });
    expect(skip.props.accessibilityState).toMatchObject({ disabled: true });
    expect(skip.props.accessibilityHint).toBe(t('hint.finishRecordingFirst'));
    expect(flattenedStyle(skip)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(skip);
    expect(mockSkipWord).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('alerts with localized copy when the skip fails and keeps the question', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockRejectedValue(new ApiError(429, 'rate limited', 30));
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      t('practice.skipFailedTitle'),
      `${t('error.tooMany')} ${t('wait.seconds', { count: 30 })}`,
    );
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('alerts when the post-skip refetch fails, since the parked word stays on screen', async () => {
    // The skip itself succeeded but the replacement question could not load;
    // refetch() never throws, so the failure must be read off its result or it
    // would pass silently with the parked word still showing.
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockRejectedValueOnce(new Error('network down'));
    mockSkipWord.mockResolvedValue(undefined);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id);
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenCalledWith(t('practice.skipFailedTitle'), t('practice.skipFailed'));
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
  });
});

describe('inline rate-limit notice', () => {
  const WAIT_MESSAGE = `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`;

  it('renders the recorder-reported wait line inline on the practice screen', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(recorderProps().onRateLimited).toEqual(expect.any(Function));
    await act(async () => recorderProps().onRateLimited?.(WAIT_MESSAGE));

    const notice = screen.getByText(WAIT_MESSAGE);
    expect(notice).toBeTruthy();
    // The wait line is an alert for assistive tech, not a silent style change.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('clears the practice wait line as soon as a new submission locks the recorder', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onRateLimited?.(WAIT_MESSAGE));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    // Releasing the lock is not a new take: the wait line has to survive it.
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(screen.queryByText(WAIT_MESSAGE)).toBeNull();
  });

  it('renders the wait line inline on the attempt screen too', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onRateLimited?.(WAIT_MESSAGE));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(screen.queryByText(WAIT_MESSAGE)).toBeNull();
  });
});

describe('level-up celebration', () => {
  const B2_QUESTION: Question = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    cefrLevel: 'B2',
    promptWord: 'ambition',
    questionText: 'What is your biggest ambition?',
  };

  const B2_PRACTICE_QUESTION: PracticeQuestionPayload = {
    question: B2_QUESTION,
    kind: 'new',
    progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 12, dueCount: 0 },
  };

  const LEVEL_UP_RESULT: AttemptResult = {
    passed: true,
    mastered: true,
    attemptNo: 1,
    score: 90,
    transcript: 'A detailed answer.',
    feedback: 'Excellent.',
    next: B2_PRACTICE_QUESTION,
    levelUp: { from: 'B1', to: 'B2' },
  };

  function renderLevelUpFeedback(queryClient?: QueryClient) {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: LEVEL_UP_RESULT },
    });
    return renderScreen(<FeedbackScreen />, queryClient);
  }

  it('celebrates the promotion with localized copy, a hidden emoji, and a success haptic', async () => {
    await renderLevelUpFeedback();

    expect(screen.getByRole('header', { name: t('levelUp.title') })).toBeTruthy();
    expect(screen.getByText(t('levelUp.body', { level: 'B2' }))).toBeTruthy();
    expect(screen.getByText(t('levelUp.progress', { from: 'B1', to: 'B2' }))).toBeTruthy();
    expect(screen.getByText(t('cefr.B2'))).toBeTruthy();
    // The celebration replaces the plain mastery headline.
    expect(screen.queryByText(t('feedback.masteredTitle'))).toBeNull();
    expect(screen.getByText(t('feedback.scoreLine', { score: 90 }))).toBeTruthy();

    const rocket = screen.getByText('🚀', { includeHiddenElements: true });
    expect(rocket.props.accessibilityElementsHidden).toBe(true);
    expect(rocket.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
    expect(flattenedStyle(screen.getByRole('header', { name: t('levelUp.title') }))).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.success,
    });
    expect(flattenedStyle(screen.getByText(t('levelUp.body', { level: 'B2' })))).toEqual({
      marginTop: spacing.sm,
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
    });
  });

  it('applies the new level before continuing to the next question', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderLevelUpFeedback(queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    // The next question is seeded under the NEW level's cache key and the
    // local user adopts that level so the practice screen reads that key.
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B2'])).toEqual(
      B2_PRACTICE_QUESTION,
    );
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B1'])).toBeUndefined();
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({ ...USER, cefrLevel: 'B2' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('treats hardware back as Next Question on the level-up variant', async () => {
    const queryClient = makeQueryClient();
    await renderLevelUpFeedback(queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B2'])).toEqual(
      B2_PRACTICE_QUESTION,
    );
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({ ...USER, cefrLevel: 'B2' });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });
});

describe('home stats freshness', () => {
  it('marks stats and history stale when scored feedback is shown', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });

  it('leaves stats alone for native answers and silence — they change nothing', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });
});

describe('practice explainer across accounts', () => {
  const OTHER_USER: User = {
    ...USER,
    id: '550e8400-e29b-41d4-a716-4466554400aa',
    name: 'Grace Hopper',
  };

  function seedQuestionFor(user: User) {
    const client = makeQueryClient();
    client.setQueryData(['practice-question', user.id, user.cefrLevel], PRACTICE_QUESTION);
    return client;
  }

  it('re-reads the stored flag for a new account and never shows one learner the other’s card', async () => {
    // The first learner has not seen the explainer; the second learner's read
    // never settles, so anything on screen for them came from stale state.
    mockPracticeIntro.hasSeenPracticeIntro
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(new Promise<boolean>(() => undefined));
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(
      <PracticeScreen />,
      seedQuestionFor(OTHER_USER),
    );
    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();

    mockAuthValue = makeAuth({ user: OTHER_USER });
    await act(async () => {
      await rerenderScreen(<PracticeScreen />);
    });

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockPracticeIntro.hasSeenPracticeIntro).toHaveBeenLastCalledWith(OTHER_USER.id);
    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
  });

  it('ignores an explainer read that lands after the learner switched accounts', async () => {
    let settleFirstRead: ((seen: boolean) => void) | undefined;
    mockPracticeIntro.hasSeenPracticeIntro
      .mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          settleFirstRead = resolve;
        }),
      )
      .mockResolvedValueOnce(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(
      <PracticeScreen />,
      seedQuestionFor(OTHER_USER),
    );
    await screen.findByText('Describe a time you showed courage.');

    mockAuthValue = makeAuth({ user: OTHER_USER });
    await act(async () => {
      await rerenderScreen(<PracticeScreen />);
    });
    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();

    // The first account's read finally resolves with the opposite answer: it
    // belongs to a learner who is no longer here and must be dropped.
    await act(async () => {
      settleFirstRead?.(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(t('practiceIntro.title'))).toBeTruthy();
  });
});

describe('skip word busy state', () => {
  it('reports the skip as busy until it settles, then hands the control back', async () => {
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
    let settleSkip: (() => void) | undefined;
    mockSkipWord.mockReturnValue(
      new Promise<void>((resolve) => {
        settleSkip = () => resolve();
      }),
    );
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const skip = () => screen.getByRole('button', { name: t('practice.skipWord') });

    expect(skip().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(flattenedStyle(skip()).opacity).toBeUndefined();

    await fireEvent.press(skip());
    expect(skip().props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(flattenedStyle(skip())).toMatchObject({ opacity: 0.5 });

    await act(async () => {
      settleSkip?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(skip().props.accessibilityState).toEqual({ disabled: false, busy: false }),
    );
    expect(flattenedStyle(skip()).opacity).toBeUndefined();
  });

  it('hands the control back after a failed skip and uses the skip fallback copy', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockRejectedValue(new Error('private network detail'));
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alertSpy).toHaveBeenCalledWith(t('practice.skipFailedTitle'), t('practice.skipFailed'));
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
  });
});

describe('practice home presentation', () => {
  async function renderLoadedHome(payload: PracticeQuestionPayload = PRACTICE_QUESTION) {
    mockApiFetch.mockResolvedValue(payload);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(payload.question.questionText);
  }

  const CARD_LABEL = {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  };

  const CENTERED_STATE = {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays the screen out on the shared page tokens', async () => {
    await renderLoadedHome();

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('practice.greeting', { name: USER.name })))).toEqual({
      fontSize: 15,
      color: colors.muted,
      marginBottom: spacing.md,
    });
    // The recorder gets a reserved, vertically centred slot so the layout does
    // not jump between its idle, recording, and uploading heights.
    expect(recorderAreaStyle()).toEqual({ minHeight: 330, justifyContent: 'center' });
  });

  it('renders the question card, its labels, and the progress lines from the tokens', async () => {
    await renderLoadedHome();

    const promptWord = screen.getByText('courage');
    expect(flattenedStyle(promptWord)).toEqual({
      marginTop: spacing.xs,
      fontSize: 30,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(promptWord))).toEqual({
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(screen.getByText(QUESTION.questionText))).toEqual({
      marginTop: spacing.xs,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
    });
    // Both halves of the card are named for the learner.
    expect(flattenedStyle(screen.getByText(t('label.word')))).toEqual(CARD_LABEL);
    expect(flattenedStyle(screen.getByText(t('label.question')))).toEqual(CARD_LABEL);
    expect(flattenedStyle(screen.getByText(t('cefr.B1')))).toEqual({
      fontSize: 13,
      color: colors.muted,
      marginBottom: spacing.xs,
    });
    expect(
      flattenedStyle(
        screen.getByText(
          t('practice.progressLine', { mastered: 2, total: 8 }) +
            t('practice.progressLearning', { count: 1 }),
        ),
      ),
    ).toEqual({ fontSize: 13, color: colors.muted, marginBottom: spacing.xs });
  });

  it('tints the badge row for a brand-new word', async () => {
    await renderLoadedHome();

    const levelBadgeText = screen.getByText('B1');
    expect(flattenedStyle(levelBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(levelBadgeText))).toEqual({
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginBottom: spacing.xs,
    });
    expect(flattenedStyle(parentOf(parentOf(levelBadgeText)))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    });

    const newBadgeText = screen.getByText(t('practice.newWord'));
    expect(flattenedStyle(newBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.onSuccess,
    });
    expect(flattenedStyle(parentOf(newBadgeText))).toEqual({
      backgroundColor: colors.success,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('swaps the badge to the warning palette for a word under review', async () => {
    await renderLoadedHome({
      question: QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });

    const revisionText = screen.getByText(t('practice.revision'));
    expect(flattenedStyle(revisionText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.onWarning,
    });
    expect(flattenedStyle(parentOf(revisionText))).toEqual({
      backgroundColor: colors.warning,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('renders the attempt chip in the primary chip palette', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, attemptsLeft: 2 },
    });
    await renderLoadedHome();

    const chipText = screen.getByText(
      t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS }),
    );
    expect(flattenedStyle(chipText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(chipText))).toEqual({
      backgroundColor: colors.primaryLight,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('renders the first-visit explainer as a primary-tinted card', async () => {
    mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(false);
    await renderLoadedHome();

    const title = await screen.findByText(t('practiceIntro.title'));
    expect(flattenedStyle(title)).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(title))).toEqual({
      marginBottom: spacing.md,
      backgroundColor: colors.primaryLight,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practiceIntro.silence')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('practiceIntro.dismiss') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });

  it('renders the help affordance as an elevated primary circle', async () => {
    await renderLoadedHome();

    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel')))).toEqual({
      alignSelf: 'flex-end',
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    });
    expect(flattenedStyle(screen.getByText('?'))).toEqual({
      color: colors.onPrimary,
      fontSize: 20,
      fontWeight: '800',
    });
  });

  it('deepens the help-button shadow in the dark palette', async () => {
    asMock(useColorScheme).mockReturnValue('dark');
    await renderLoadedHome();

    // A 0.15 shadow disappears on a dark surface; dark mode raises it.
    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel')))).toMatchObject({
      backgroundColor: darkColors.primary,
      shadowColor: darkColors.shadow,
      shadowOpacity: 0.4,
    });
    expect(screenContainerStyle()).toMatchObject({ backgroundColor: darkColors.background });
  });

  it('keeps each badge ink paired with its own fill in the dark palette', async () => {
    // The light palette paints every on-fill ink white, so only the dark
    // palette can show whether the review badge really takes its own ink.
    expect(darkColors.onSuccess).not.toBe(darkColors.onWarning);
    asMock(useColorScheme).mockReturnValue('dark');
    await renderLoadedHome();

    const newBadgeText = screen.getByText(t('practice.newWord'));
    expect(flattenedStyle(newBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onSuccess,
    });
    expect(flattenedStyle(parentOf(newBadgeText))).toMatchObject({
      backgroundColor: darkColors.success,
    });

    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({
      question: QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });
    await renderScreen(<PracticeScreen />);
    const revisionText = await screen.findByText(t('practice.revision'));
    expect(flattenedStyle(revisionText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onWarning,
    });
    expect(flattenedStyle(parentOf(revisionText))).toMatchObject({
      backgroundColor: darkColors.warning,
    });
  });

  it('keeps the switch, skip, and footer controls on the token scale', async () => {
    await renderLoadedHome();

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toEqual({
      alignSelf: 'center',
      marginTop: spacing.md,
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.ml,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    });

    expect(flattenedStyle(screen.getByRole('button', { name: t('practice.skipWord') }))).toEqual({
      alignSelf: 'center',
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.ml,
    });
    expect(flattenedStyle(screen.getByText(t('practice.skipWord')))).toEqual({
      fontSize: 14,
      color: colors.muted,
      textDecorationLine: 'underline',
    });

    const settings = screen.getByRole('button', { name: t('practice.settings') });
    expect(flattenedStyle(settings)).toEqual({
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.ml,
    });
    expect(flattenedStyle(screen.getByText(t('practice.settings')))).toEqual({
      fontSize: 14,
      color: colors.muted,
      textDecorationLine: 'underline',
    });
    expect(flattenedStyle(parentOf(settings))).toEqual({
      minHeight: 56,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.ml,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingBottom: 10,
    });
  });

  it('explains every locked control while the recorder holds a take', async () => {
    await renderLoadedHome();
    await act(async () => recorderProps().onInteractionLockChange?.(true));

    const hint = t('hint.finishRecordingFirst');
    expect(screen.getByLabelText(t('practice.helpLabel')).props.accessibilityHint).toBe(hint);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityHint,
    ).toBe(hint);
    expect(
      screen.getByRole('button', { name: t('practice.settings') }).props.accessibilityHint,
    ).toBe(hint);
    expect(screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityHint).toBe(
      hint,
    );
    expect(
      flattenedStyle(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') })),
    ).toMatchObject({ opacity: 0.5 });

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(screen.getByLabelText(t('practice.helpLabel')).props.accessibilityHint).toBeUndefined();
    expect(
      screen.getByRole('button', { name: t('practice.settings') }).props.accessibilityHint,
    ).toBeUndefined();
    expect(
      flattenedStyle(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }))
        .opacity,
    ).toBeUndefined();
  });

  it('centres the loading state and labels its spinner', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />);

    const loading = screen.getByText(t('practice.loadingQuestion'));
    expect(flattenedStyle(loading)).toEqual(MUTED_BODY);
    expect(flattenedStyle(parentOf(loading))).toEqual(CENTERED_STATE);
    expect(screen.getByLabelText(t('practice.loadingQuestion'))).toBeTruthy();
  });

  it('centres the load failure and spaces its retry action', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<PracticeScreen />);

    const title = await screen.findByRole('header', { name: t('practice.loadFailedTitle') });
    expect(flattenedStyle(title)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(title))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });

  it('renders the inline wait notice as a danger-tinted card', async () => {
    await renderLoadedHome();
    const wait = `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`;
    await act(async () => recorderProps().onRateLimited?.(wait));

    const notice = screen.getByRole('alert');
    expect(flattenedStyle(notice)).toEqual({
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(flattenedStyle(parentOf(notice))).toEqual({
      marginTop: spacing.md,
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: radii.input,
      padding: spacing.md,
    });
  });
});

describe('practice attempt presentation', () => {
  async function renderLoadedAttempt() {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');
  }

  const CENTERED_STATE = {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays Practice Mode out on the shared page tokens', async () => {
    await renderLoadedAttempt();

    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    // Practice Mode gives the recorder the rest of the screen instead of a
    // fixed slot: there is nothing below it to protect from reflow.
    expect(recorderAreaStyle()).toEqual({ flex: 1, justifyContent: 'center' });
  });

  it('renders the stripped-back question card from the tokens', async () => {
    await renderLoadedAttempt();

    const promptWord = screen.getByText('courage');
    expect(flattenedStyle(promptWord)).toEqual({
      fontSize: 30,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(promptWord))).toEqual({
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(screen.getByText(QUESTION.questionText))).toEqual({
      marginTop: 10,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
    });
  });

  it('renders the attempt chip above the word', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, attemptsLeft: 2 },
    });
    await renderLoadedAttempt();

    const chipText = screen.getByText(
      t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS }),
    );
    expect(flattenedStyle(chipText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(chipText))).toEqual({
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginBottom: spacing.xs,
    });
  });

  it('keeps the language switch on the token scale and tints it when pressed', async () => {
    await renderLoadedAttempt();

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toEqual({
      alignSelf: 'center',
      marginTop: spacing.ml,
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.ml,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { borderColor: colors.primary },
      { backgroundColor: colors.primaryLight },
    );
  });

  it('centres the loading, failure, and broken-link states', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<AttemptScreen />);

    const loading = screen.getByText(t('attempt.loading'));
    expect(flattenedStyle(loading)).toEqual(MUTED_BODY);
    expect(flattenedStyle(parentOf(loading))).toEqual(CENTERED_STATE);

    mockApiFetch.mockReset();
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<AttemptScreen />);

    const failureTitle = await screen.findByRole('header', {
      name: t('attempt.loadFailedTitle'),
    });
    expect(flattenedStyle(failureTitle)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(failureTitle))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });

    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<AttemptScreen />);

    const brokenLinkTitle = screen.getByRole('header', { name: t('help.invalidLinkTitle') });
    expect(flattenedStyle(parentOf(brokenLinkTitle))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('attempt.invalidLinkBody')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.backToPractice') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });

  it('renders the inline wait notice as a danger-tinted card', async () => {
    await renderLoadedAttempt();
    const wait = `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`;
    await act(async () => recorderProps().onRateLimited?.(wait));

    const notice = screen.getByRole('alert');
    expect(flattenedStyle(notice)).toEqual({
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(flattenedStyle(parentOf(notice))).toEqual({
      marginTop: spacing.md,
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: radii.input,
      padding: spacing.md,
    });
  });
});

describe('practice help presentation', () => {
  async function renderLoadedHelp() {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText(t('label.word'));
  }

  const CENTERED_STATE = {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays the help sheet out on the shared page tokens', async () => {
    await renderLoadedHelp();

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      padding: layout.screenPadding,
      paddingBottom: spacing.xxl,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(
      flattenedStyle(parentOf(screen.getByRole('button', { name: t('help.startPractice') }))),
    ).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('renders each section as a card with a label, English, and native text', async () => {
    await renderLoadedHelp();

    const sectionLabel = screen.getByText(t('label.word'));
    expect(flattenedStyle(sectionLabel)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    });
    expect(flattenedStyle(parentOf(sectionLabel))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    });
    expect(flattenedStyle(screen.getByText('courage'))).toEqual({
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText('Describe a time you showed courage.'))).toEqual({
      fontSize: 17,
      lineHeight: 24,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText('ధైర్యం'))).toEqual({
      marginTop: 6,
      fontSize: 16,
      lineHeight: 23,
      color: colors.muted,
    });
  });

  it('separates each example with a rule and a numbered accent line', async () => {
    await renderLoadedHelp();

    const exampleNumber = screen.getByText(t('help.exampleNumber', { number: 1 }));
    expect(flattenedStyle(exampleNumber)).toEqual({
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.xs,
    });
    expect(flattenedStyle(parentOf(exampleNumber))).toEqual({
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    });
  });

  it('centres the loading, failure, and broken-link states', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<HelpScreen />);

    const loading = screen.getByText(t('help.loading'));
    expect(flattenedStyle(loading)).toEqual(MUTED_BODY);
    expect(flattenedStyle(parentOf(loading))).toEqual(CENTERED_STATE);

    mockApiFetch.mockReset();
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />);

    const failureTitle = await screen.findByRole('header', { name: t('help.loadFailedTitle') });
    expect(flattenedStyle(failureTitle)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(failureTitle))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });

    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    const brokenLinkTitle = screen.getByRole('header', { name: t('help.invalidLinkTitle') });
    expect(flattenedStyle(parentOf(brokenLinkTitle))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('help.invalidLinkBody')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.backToPractice') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });
});

describe('feedback outcome wiring', () => {
  const NATIVE_RESULT: NativeAttemptResult = {
    mode: 'native',
    understood: true,
    transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
    modelAnswer: 'She showed courage at work.',
    feedback: 'You understood the question.',
  };

  const NO_SPEECH_RESULT: AttemptResult = {
    passed: false,
    mastered: false,
    noSpeech: true,
    attemptNo: 1,
    attemptsLeft: 3,
    score: 0,
    transcript: '',
    feedback: 'We could not detect any speech.',
  };

  it.each([
    ['hi', 'hi-IN'],
    ['es', 'es-ES'],
    ['zh', 'zh-Hans'],
  ] as const)('reads a %s learner’s own answer back in their language', async (language, tag) => {
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: language } });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: NATIVE_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”').props.accessibilityLanguage).toBe(tag);
  });

  it('reads an English answer back as English, whatever the learner speaks', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    // USER speaks Telugu, but this transcript is the learner's English.
    expect(screen.getByText('“I enjoy reading.”').props.accessibilityLanguage).toBe('en-US');
  });

  it('never celebrates a promotion that arrives with a failed attempt', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
          levelUp: { from: 'B1', to: 'B2' },
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.finalTitle'))).toBeTruthy();
    expect(screen.queryByText(t('levelUp.title'))).toBeNull();
    expect(screen.queryByText(t('levelUp.body', { level: 'B2' }))).toBeNull();
    expect(screen.queryByText(t('levelUp.progress', { from: 'B1', to: 'B2' }))).toBeNull();
  });

  it('keeps the model English answer hidden when the native answer was silence', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          mode: 'native',
          understood: false,
          transcript: '',
          modelAnswer: 'She showed courage at work.',
          feedback: 'We could not detect any speech.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    // Nothing was said, so there is nothing to translate back: showing the
    // answer here would hand it over for free.
    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.queryByText(t('feedback.sayInEnglish'))).toBeNull();
    expect(screen.queryByText('She showed courage at work.')).toBeNull();
  });

  it('does not open help for a card that has no question behind it', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: '', result: NO_SPEECH_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.seeHelp') }));

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('celebrates the outcome the card is showing now, not the one it mounted with', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
      },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    expect(jest.mocked(Haptics.notificationAsync)).not.toHaveBeenCalled();

    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: { ...PASSED_RESULT, mastered: true, score: 88 },
      },
    });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(screen.getByText(t('feedback.masteredTitle'))).toBeTruthy();
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
  });

  it('marks home stats stale when a scored outcome replaces a native one', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: NATIVE_RESULT },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />, queryClient);
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['practice-stats'] });

    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });
});

describe('practice feedback presentation', () => {
  const SUBTITLE = {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays the feedback card out on the shared page tokens', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      padding: spacing.xl,
      alignItems: 'center',
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });

    const header = screen.getByRole('header', { name: t('feedback.passedTitle') });
    expect(flattenedStyle(header)).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.success,
    });
    expect(flattenedStyle(parentOf(header))).toEqual({
      alignSelf: 'stretch',
      alignItems: 'center',
    });
    expect(flattenedStyle(screen.getByText('🎉', { includeHiddenElements: true }))).toEqual({
      fontSize: 52,
      marginTop: spacing.md,
    });
    expect(
      flattenedStyle(screen.getByText(t('feedback.passedBody', { score: PRACTICE_MASTER_SCORE }))),
    ).toEqual(SUBTITLE);
    expect(flattenedStyle(screen.getByText(t('feedback.scoreLine', { score: 72 })))).toEqual({
      marginTop: spacing.ml,
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(
      flattenedStyle(
        screen.getByText(
          t('feedback.scoreMeaning', {
            pass: PRACTICE_PASS_SCORE,
            master: PRACTICE_MASTER_SCORE,
          }),
        ),
      ),
    ).toEqual({
      marginTop: spacing.xs,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    });
  });

  it('renders the transcript and feedback card from the tokens', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    const cardLabel = screen.getByText(t('feedback.weHeard'));
    expect(flattenedStyle(cardLabel)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 14,
    });
    expect(flattenedStyle(parentOf(cardLabel))).toEqual({
      marginTop: spacing.xl,
      alignSelf: 'stretch',
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    // The learner's own words are set apart in italics.
    expect(flattenedStyle(screen.getByText('“I enjoy reading.”'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      fontStyle: 'italic',
      lineHeight: 23,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText('Nice work.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    });
    expect(
      flattenedStyle(parentOf(screen.getByRole('button', { name: t('feedback.nextQuestion') }))),
    ).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('accents the model English answer under the native verdict', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          mode: 'native',
          understood: true,
          transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'You understood the question.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(flattenedStyle(screen.getByText('She showed courage at work.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 24,
      color: colors.primary,
      fontWeight: '600',
    });
    expect(flattenedStyle(screen.getByText(t('feedback.nativeUnderstoodBody')))).toEqual(SUBTITLE);
  });

  it('stacks the two silence actions in a spaced column', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          mastered: false,
          noSpeech: true,
          attemptNo: 1,
          attemptsLeft: 3,
          score: 0,
          transcript: '',
          feedback: 'We could not detect any speech.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    const column = parentOf(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(flattenedStyle(column)).toEqual({ gap: 10 });
    expect(flattenedStyle(parentOf(column))).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('centres the empty-feedback state and spaces its way out', async () => {
    await renderScreen(<FeedbackScreen />);

    const title = screen.getByRole('header', { name: t('feedback.noResultTitle') });
    expect(flattenedStyle(parentOf(title))).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(screen.getByText(t('feedback.noResultBody')))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.backToPractice') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });
});
