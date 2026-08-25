import { InfiniteQueryObserver, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RecordingsScreen from '../src/app/recordings';
import { apiGetRecordings, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { translateFor } from '../src/lib/i18n';
import type { RecordingItem, User } from '../src/lib/types';

const t = (key: Parameters<typeof translateFor>[1], params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const asMock = (value: unknown) => value as jest.Mock;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Learner',
  email: 'learner@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let leaseCurrent = true;
const mockAuth = {
  token: 'token',
  user: USER,
  sessionVersion: 1,
  isRestoring: false,
  restoreError: null,
  retrySessionRestore: jest.fn(),
  resetStoredSession: jest.fn(),
  captureSessionLease: jest.fn(() => ({}) as never),
  isSessionLeaseCurrent: jest.fn(() => leaseCurrent),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
  setUser: jest.fn(),
};

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: jest.fn(() => mockAuth),
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetRecordings: jest.fn(),
}));

jest.mock('../src/components/RecordingPlayback', () => ({
  __esModule: true,
  default: ({ recordingId }: { recordingId: string }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Text: NativeText } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactActual.createElement(NativeText, null, `player:${recordingId}`);
  },
}));

const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
const SECOND_ID = '550e8400-e29b-41d4-a716-446655440012';

function recording(overrides: Partial<RecordingItem> = {}): RecordingItem {
  return {
    id: RECORDING_ID,
    questionId: '550e8400-e29b-41d4-a716-446655440021',
    context: 'practice',
    promptWord: 'courage',
    questionText: 'Describe a time you showed courage.',
    cefrLevel: 'B1',
    contentType: 'audio/mp4',
    sizeBytes: 2_048,
    durationMs: 8_000,
    status: 'available',
    createdAt: '2026-08-25T00:00:00.000Z',
    availableAt: '2026-08-25T00:00:01.000Z',
    ...overrides,
  };
}

const clients: QueryClient[] = [];
async function renderRecordings(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  clients.push(client);
  const view = await render(
    <QueryClientProvider client={client}>
      <RecordingsScreen />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

beforeEach(() => {
  leaseCurrent = true;
  asMock(useAuth).mockClear();
  asMock(apiGetRecordings).mockReset();
});

afterEach(async () => {
  await cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe('recordings library', () => {
  it('renders a polished loading, empty, and error state with joined manual retries', async () => {
    let resolve!: (value: { items: RecordingItem[]; nextCursor: null }) => void;
    asMock(apiGetRecordings).mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );
    const loading = await renderRecordings();
    expect(screen.getByText(t('recordings.loading'))).toBeTruthy();
    resolve({ items: [], nextCursor: null });
    await waitFor(() => expect(screen.getByText(t('recordings.emptyTitle'))).toBeTruthy());
    await loading.unmount();

    asMock(apiGetRecordings).mockRejectedValueOnce(new ApiError(0, 'offline'));
    await renderRecordings();
    await waitFor(() => expect(screen.getByText(t('recordings.loadFailedTitle'))).toBeTruthy());
    asMock(apiGetRecordings).mockResolvedValueOnce({ items: [], nextCursor: null });
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(screen.getByText(t('recordings.emptyTitle'))).toBeTruthy());
  });

  it('renders metadata, native context, pending state, and contextual playback', async () => {
    asMock(apiGetRecordings).mockResolvedValue({
      items: [
        recording({ context: 'practice-native', status: 'retention_pending', availableAt: null }),
      ],
      nextCursor: null,
    });
    await renderRecordings();
    await waitFor(() => expect(screen.getByText('courage')).toBeTruthy());
    expect(screen.getByText(t('recordings.contextNative'))).toBeTruthy();
    expect(screen.getByText(t('recordings.statusPending'))).toBeTruthy();
    expect(screen.getByText('0:08 · 2 KB')).toBeTruthy();
    expect(screen.getByText(`player:${RECORDING_ID}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.checkPending') }));
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
  });

  it('formats byte, megabyte, missing-duration, and unavailable metadata', async () => {
    asMock(apiGetRecordings).mockResolvedValue({
      items: [
        recording({ sizeBytes: 500, durationMs: null, status: 'unavailable', availableAt: null }),
        recording({
          id: SECOND_ID,
          promptWord: 'travel',
          sizeBytes: 2 * 1024 * 1024,
          durationMs: 120_000,
        }),
      ],
      nextCursor: null,
    });
    await renderRecordings();
    await waitFor(() => expect(screen.getByText('500 B')).toBeTruthy());
    expect(screen.getByText('2:00 · 2.0 MB')).toBeTruthy();
    expect(screen.getByText(t('recordings.statusUnavailable'))).toBeTruthy();
  });

  it('pages older recordings once and rejects cursor cycles', async () => {
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: RECORDING_ID,
      });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await waitFor(() => expect(screen.getByText('travel')).toBeTruthy());
    expect(screen.queryByRole('button', { name: t('recordings.loadMore') })).toBeNull();
    expect(apiGetRecordings).toHaveBeenNthCalledWith(2, RECORDING_ID, expect.any(AbortSignal));
  });

  it('does not page after its captured session lease expires', async () => {
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: RECORDING_ID });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    leaseCurrent = false;
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(apiGetRecordings).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded recordings visible and requires an explicit retry after an older page fails', async () => {
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockRejectedValueOnce(new ApiError(503, 'busy'))
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText('courage')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(screen.getByText('travel')).toBeTruthy());
  });

  it('queues one older-page request behind an in-flight ordinary refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['recordings', USER.id], {
      pages: [{ items: [recording()], nextCursor: RECORDING_ID }],
      pageParams: [undefined],
    });
    let resolveRefresh!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
    const refresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
      resolveRefresh = resolve;
    });
    let resolveOlder!: (value: { items: RecordingItem[]; nextCursor: null }) => void;
    const older = new Promise<{ items: RecordingItem[]; nextCursor: null }>((resolve) => {
      resolveOlder = resolve;
    });
    asMock(apiGetRecordings).mockReturnValueOnce(refresh).mockReturnValueOnce(older);
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    await renderRecordings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(refetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRefresh({ items: [recording()], nextCursor: RECORDING_ID });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      resolveOlder({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
      await Promise.resolve();
    });
    expect(await screen.findByText('travel')).toBeTruthy();
  });
});
