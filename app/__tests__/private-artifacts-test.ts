import { Directory, File, Paths } from 'expo-file-system';

import {
  claimPrivateExportFile,
  claimPrivatePlaybackFile,
  cleanupPrivateArtifacts,
  downloadPrivatePlaybackFile,
} from '../src/lib/private-artifacts';

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440001';
const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
const PLAYBACK_URL = 'https://private.example.invalid/recording';
const PLAYBACK_EXTENSIONS = [
  ['audio/m4a', 'm4a'],
  ['audio/mp4', 'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['video/mp4', 'm4a'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/wave', 'wav'],
  ['audio/ogg', 'ogg'],
  ['application/ogg', 'ogg'],
  ['audio/webm', 'webm'],
  ['video/webm', 'webm'],
  ['audio/flac', 'flac'],
  ['audio/x-flac', 'flac'],
] as const;

jest.mock('expo-file-system', () => {
  const baseUri = 'file:///mock-cache';
  const existingDirectories = new Set<string>([baseUri]);
  const unreadableDirectories = new Set<string>();
  const config: { forcedFileUri: string | null } = { forcedFileUri: null };
  const directoryEntries = new Map<string, unknown[]>();
  const directoryInstances: MockDirectory[] = [];
  const fileInstances: MockFile[] = [];

  function joinedUri(segments: unknown[]): string {
    const values = segments.map((segment) =>
      typeof segment === 'string'
        ? segment
        : ((segment as { uri?: string }).uri ?? String(segment)),
    );
    const [first = '', ...rest] = values;
    return [first.replace(/\/$/, ''), ...rest.map((value) => value.replace(/^\/+|\/+$/g, ''))]
      .filter(Boolean)
      .join('/');
  }

  function markDirectoryAndParents(uri: string): void {
    let current = uri;
    for (;;) {
      existingDirectories.add(current);
      const slash = current.lastIndexOf('/');
      if (slash <= 'file://'.length) return;
      current = current.slice(0, slash);
    }
  }

  class MockDirectory {
    readonly uri: string;
    exists: boolean;
    readonly create = jest.fn((options?: { intermediates?: boolean }) => {
      if (options?.intermediates) markDirectoryAndParents(this.uri);
      else existingDirectories.add(this.uri);
      this.exists = true;
    });
    readonly list = jest.fn(() => {
      if (!this.exists) throw new Error('missing directory');
      if (unreadableDirectories.has(this.uri)) throw new Error('unreadable directory');
      return directoryEntries.get(this.uri) ?? [];
    });

    constructor(...segments: unknown[]) {
      this.uri = joinedUri(segments);
      this.exists = existingDirectories.has(this.uri);
      directoryInstances.push(this);
    }
  }

  class MockFile {
    static downloadFileAsync = jest.fn(
      async (_url: string, destination: MockFile, _options?: unknown) => {
        destination.exists = true;
        return destination;
      },
    );

    readonly uri: string;
    readonly name: string;
    exists = false;
    readonly delete = jest.fn(() => {
      if (!this.exists) throw new Error('missing file');
      this.exists = false;
    });
    readonly write = jest.fn(() => {
      this.exists = true;
    });

    constructor(...segments: unknown[]) {
      this.uri = config.forcedFileUri ?? joinedUri(segments);
      this.name = this.uri.slice(this.uri.lastIndexOf('/') + 1);
      fileInstances.push(this);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: baseUri } },
    __mockState: {
      baseUri,
      config,
      directoryEntries,
      directoryInstances,
      existingDirectories,
      fileInstances,
      unreadableDirectories,
      reset: () => {
        existingDirectories.clear();
        existingDirectories.add(baseUri);
        config.forcedFileUri = null;
        directoryEntries.clear();
        unreadableDirectories.clear();
        directoryInstances.length = 0;
        fileInstances.length = 0;
        MockFile.downloadFileAsync
          .mockReset()
          .mockImplementation(async (_url: string, destination: MockFile) => {
            destination.exists = true;
            return destination;
          });
      },
    },
  };
});

interface MockFileShape {
  uri: string;
  name: string;
  exists: boolean;
  delete: jest.Mock;
  write: jest.Mock;
}

interface MockDirectoryShape {
  uri: string;
  exists: boolean;
  create: jest.Mock;
  list: jest.Mock;
}

const fsState = (
  jest.requireMock('expo-file-system') as {
    __mockState: {
      baseUri: string;
      config: { forcedFileUri: string | null };
      directoryEntries: Map<string, (MockDirectoryShape | MockFileShape)[]>;
      directoryInstances: MockDirectoryShape[];
      existingDirectories: Set<string>;
      fileInstances: MockFileShape[];
      unreadableDirectories: Set<string>;
      reset: () => void;
    };
  }
).__mockState;
const mockDownload = File.downloadFileAsync as jest.Mock;

beforeEach(() => {
  fsState.reset();
  jest.useRealTimers();
});

it('downloads playback into a unique account-scoped cache file and deletes it on release', async () => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/mp4');
  const controller = new AbortController();

  expect(fsState.directoryInstances.at(-1)).toMatchObject({
    uri: `${fsState.baseUri}/ai-english-coach-private-v1/playback/${OWNER_ID}`,
  });
  expect(fsState.directoryInstances.at(-1)?.create).toHaveBeenCalledWith({
    idempotent: true,
    intermediates: true,
  });
  expect(artifact.file.uri).toMatch(
    new RegExp(
      `/ai-english-coach-private-v1/playback/${OWNER_ID}/${RECORDING_ID}--[a-z0-9]+-[a-z0-9]+\\.m4a$`,
    ),
  );

  await downloadPrivatePlaybackFile(PLAYBACK_URL, artifact, controller.signal);

  expect(mockDownload).toHaveBeenCalledWith(PLAYBACK_URL, artifact.file, {
    idempotent: false,
    signal: controller.signal,
  });
  expect(artifact.isCurrent()).toBe(true);
  artifact.release();
  expect(artifact.isCurrent()).toBe(false);
  expect((artifact.file as unknown as MockFileShape).delete).toHaveBeenCalledTimes(1);
});

it('uses a dedicated export area and never reuses one operation path', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-28T00:00:00.000Z'));
  const first = claimPrivateExportFile(OWNER_ID);
  const second = claimPrivateExportFile(OWNER_ID);

  expect(first.file.uri).toContain(
    `${fsState.baseUri}/ai-english-coach-private-v1/exports/${OWNER_ID}/account-data--`,
  );
  expect(first.file.uri).toMatch(/\.json$/);
  expect(second.file.uri).not.toBe(first.file.uri);

  (first.file as unknown as MockFileShape).exists = true;
  (second.file as unknown as MockFileShape).exists = true;
  first.release();
  first.release();
  expect((first.file as unknown as MockFileShape).delete).toHaveBeenCalledTimes(2);
  expect((second.file as unknown as MockFileShape).delete).not.toHaveBeenCalled();
  expect(second.isCurrent()).toBe(true);
  second.release();
});

it('does not let a stale lease delete a successor that owns the same resolved URI', () => {
  fsState.config.forcedFileUri = `${fsState.baseUri}/forced-collision.json`;
  const stale = claimPrivateExportFile(OWNER_ID);
  const successor = claimPrivateExportFile(OWNER_ID);
  const staleFile = stale.file as unknown as MockFileShape;
  const successorFile = successor.file as unknown as MockFileShape;
  staleFile.exists = true;
  successorFile.exists = true;

  stale.release();

  expect(staleFile.delete).not.toHaveBeenCalled();
  expect(successor.isCurrent()).toBe(true);
  successor.release();
  expect(successorFile.delete).toHaveBeenCalledTimes(1);
});

it('uses a safe generic extension for an unexpected retained content type', () => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'application/octet-stream');

  expect(artifact.file.uri).toMatch(/\.audio$/);
  artifact.release();
});

it.each(PLAYBACK_EXTENSIONS)('maps %s to the native-friendly .%s extension', (type, extension) => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, type);

  expect(artifact.file.uri).toMatch(new RegExp(`\\.${extension}$`));
  artifact.release();
});

it('rejects IDs with any prefix or suffix before creating an artifact', () => {
  expect(() => claimPrivateExportFile(`prefix-${OWNER_ID}`)).toThrow(
    'Invalid private-artifact owner.',
  );
  expect(() => claimPrivatePlaybackFile(OWNER_ID, `${RECORDING_ID}-suffix`, 'audio/mp4')).toThrow(
    'Invalid private-artifact owner.',
  );
});

it('releases a destination when cancellation happened before download began', async () => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/webm');
  const controller = new AbortController();
  controller.abort();

  await expect(
    downloadPrivatePlaybackFile(PLAYBACK_URL, artifact, controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError', message: 'Aborted' });
  expect(mockDownload).not.toHaveBeenCalled();
  expect(artifact.isCurrent()).toBe(false);
  expect((artifact.file as unknown as MockFileShape).delete).toHaveBeenCalledTimes(1);
});

it('rejects a lease that was retired before download began', async () => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/ogg');
  artifact.release();
  mockDownload.mockClear();

  await expect(
    downloadPrivatePlaybackFile(PLAYBACK_URL, artifact, new AbortController().signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(mockDownload).not.toHaveBeenCalled();
});

it('rechecks both cancellation and ownership after the native download resolves', async () => {
  const cancelledArtifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/flac');
  const controller = new AbortController();
  mockDownload.mockImplementationOnce(async (_url, destination: MockFileShape) => {
    destination.exists = true;
    controller.abort();
    return destination;
  });
  await expect(
    downloadPrivatePlaybackFile(PLAYBACK_URL, cancelledArtifact, controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });

  const retiredArtifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/mpeg');
  mockDownload.mockImplementationOnce(async (_url, destination: MockFileShape) => {
    destination.exists = true;
    retiredArtifact.release();
    return destination;
  });
  await expect(
    downloadPrivatePlaybackFile(PLAYBACK_URL, retiredArtifact, new AbortController().signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

it('cleans the managed destination and any unexpected returned file on a path mismatch', async () => {
  const artifact = claimPrivatePlaybackFile(OWNER_ID, RECORDING_ID, 'audio/wav');
  const unexpected = new File(Paths.cache, 'unexpected.wav') as unknown as MockFileShape;
  unexpected.exists = true;
  mockDownload.mockResolvedValueOnce(unexpected);

  await expect(
    downloadPrivatePlaybackFile(PLAYBACK_URL, artifact, new AbortController().signal),
  ).rejects.toThrow('outside its private destination');
  expect(unexpected.delete).toHaveBeenCalledTimes(1);
  expect((artifact.file as unknown as MockFileShape).delete).toHaveBeenCalledTimes(1);
  expect(artifact.isCurrent()).toBe(false);
});

it('reaps process-death orphans while preserving every live in-process lease', async () => {
  const active = claimPrivateExportFile(OWNER_ID);
  const activeFile = active.file as unknown as MockFileShape;
  activeFile.exists = true;
  const root = new Directory(
    Paths.cache,
    'ai-english-coach-private-v1',
  ) as unknown as MockDirectoryShape;
  const exportDirectory = new Directory(
    Paths.cache,
    'ai-english-coach-private-v1',
    'exports',
    OWNER_ID,
  ) as unknown as MockDirectoryShape;
  const orphan = new File(exportDirectory as never, 'orphan.json') as unknown as MockFileShape;
  orphan.exists = true;
  fsState.existingDirectories.add(root.uri);
  fsState.existingDirectories.add(exportDirectory.uri);
  root.exists = true;
  exportDirectory.exists = true;
  fsState.directoryEntries.set(root.uri, [exportDirectory]);
  fsState.directoryEntries.set(exportDirectory.uri, [activeFile, orphan]);

  await cleanupPrivateArtifacts();

  expect(activeFile.delete).not.toHaveBeenCalled();
  expect(orphan.delete).toHaveBeenCalledTimes(1);
  active.release();
});

it('limits account cleanup to that owner and tolerates invalid or unreadable paths', async () => {
  const ownerPlayback = new Directory(
    Paths.cache,
    'ai-english-coach-private-v1',
    'playback',
    OWNER_ID,
  ) as unknown as MockDirectoryShape;
  const ownerExports = new Directory(
    Paths.cache,
    'ai-english-coach-private-v1',
    'exports',
    OWNER_ID,
  ) as unknown as MockDirectoryShape;
  const otherExports = new Directory(
    Paths.cache,
    'ai-english-coach-private-v1',
    'exports',
    OTHER_OWNER_ID,
  ) as unknown as MockDirectoryShape;
  for (const directory of [ownerPlayback, ownerExports, otherExports]) {
    fsState.existingDirectories.add(directory.uri);
    directory.exists = true;
  }
  const playbackOrphan = new File(ownerPlayback as never, 'old.m4a') as unknown as MockFileShape;
  const exportOrphan = new File(ownerExports as never, 'old.json') as unknown as MockFileShape;
  const otherOrphan = new File(otherExports as never, 'other.json') as unknown as MockFileShape;
  playbackOrphan.exists = true;
  exportOrphan.exists = true;
  otherOrphan.exists = true;
  fsState.directoryEntries.set(ownerPlayback.uri, [playbackOrphan]);
  fsState.directoryEntries.set(ownerExports.uri, [exportOrphan]);
  fsState.directoryEntries.set(otherExports.uri, [otherOrphan]);
  fsState.unreadableDirectories.add(ownerPlayback.uri);

  await cleanupPrivateArtifacts(OWNER_ID);
  await cleanupPrivateArtifacts('../not-an-owner');

  expect(playbackOrphan.delete).not.toHaveBeenCalled();
  expect(exportOrphan.delete).toHaveBeenCalledTimes(1);
  expect(otherOrphan.delete).not.toHaveBeenCalled();
});

it('treats a missing global artifact root as an empty cache', async () => {
  await expect(cleanupPrivateArtifacts()).resolves.toBeUndefined();
  const managedRoot = fsState.directoryInstances.find(
    (directory) =>
      directory.uri === `${fsState.baseUri}/ai-english-coach-private-v1` && !directory.exists,
  );
  expect(managedRoot?.list).not.toHaveBeenCalled();
});

it('removes only the exact legacy root-cache export filename contract', async () => {
  const cacheDirectory = new Directory(Paths.cache) as unknown as MockDirectoryShape;
  const legacy = new File(
    Paths.cache,
    'ai-english-coach-data-1724803200000.json',
  ) as unknown as MockFileShape;
  const unrelatedJson = new File(Paths.cache, 'other-data.json') as unknown as MockFileShape;
  const lookalike = new File(
    Paths.cache,
    'ai-english-coach-data-not-a-timestamp.json',
  ) as unknown as MockFileShape;
  const prefixed = new File(
    Paths.cache,
    'copy-ai-english-coach-data-1724803200000.json',
  ) as unknown as MockFileShape;
  const suffixed = new File(
    Paths.cache,
    'ai-english-coach-data-1724803200000.json.backup',
  ) as unknown as MockFileShape;
  legacy.exists = true;
  unrelatedJson.exists = true;
  lookalike.exists = true;
  prefixed.exists = true;
  suffixed.exists = true;
  fsState.directoryEntries.set(cacheDirectory.uri, [
    legacy,
    unrelatedJson,
    lookalike,
    prefixed,
    suffixed,
  ]);

  await cleanupPrivateArtifacts(OWNER_ID);

  expect(legacy.delete).toHaveBeenCalledTimes(1);
  expect(unrelatedJson.delete).not.toHaveBeenCalled();
  expect(lookalike.delete).not.toHaveBeenCalled();
  expect(prefixed.delete).not.toHaveBeenCalled();
  expect(suffixed.delete).not.toHaveBeenCalled();
});

it('tolerates an unreadable or evicted cache root during legacy cleanup', async () => {
  const beforeUnreadable = fsState.directoryInstances.length;
  fsState.unreadableDirectories.add(fsState.baseUri);
  await expect(cleanupPrivateArtifacts()).resolves.toBeUndefined();
  const unreadableCache = fsState.directoryInstances
    .slice(beforeUnreadable)
    .find((directory) => directory.uri === fsState.baseUri);
  expect(unreadableCache?.list).toHaveBeenCalledTimes(1);

  fsState.unreadableDirectories.clear();
  fsState.existingDirectories.delete(fsState.baseUri);
  const beforeEvicted = fsState.directoryInstances.length;
  await expect(cleanupPrivateArtifacts()).resolves.toBeUndefined();
  const evictedCache = fsState.directoryInstances
    .slice(beforeEvicted)
    .find((directory) => directory.uri === fsState.baseUri);
  expect(evictedCache).toMatchObject({ exists: false });
  expect(evictedCache?.list).not.toHaveBeenCalled();
});
