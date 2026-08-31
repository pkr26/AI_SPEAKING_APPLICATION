import { Directory, File, Paths } from 'expo-file-system';

const PRIVATE_ARTIFACT_ROOT = 'ai-english-coach-private-v1';
const PLAYBACK_DIRECTORY = 'playback';
const EXPORT_DIRECTORY = 'exports';
const LEGACY_EXPORT_FILENAME = /^ai-english-coach-data-\d+\.json$/;
const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAYBACK_EXTENSION_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'application/ogg': 'ogg',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};

export interface OwnedPrivateFile {
  readonly file: File;
  /** True only while this lease still owns its exact temporary path. */
  isCurrent(): boolean;
  /** Idempotently retires ownership and removes this lease's exact file. */
  release(): void;
}

const activeFileOwners = new Map<string, symbol>();
let operationSequence = 0;

/**
 * Canonicalizes a server-issued owner or recording id, rejecting anything that
 * is not a strict UUID. The closed charset guarantees the value can never
 * contribute path separators or traversal into derived artifact paths, and the
 * lowercase form makes two spellings of one id share a single directory.
 */
function safeId(value: string): string {
  if (!SAFE_ID.test(value)) throw new Error('Invalid private-artifact owner.');
  return value.toLowerCase();
}

/**
 * Mints a unique suffix for one download/export operation from a radix-36
 * clock stamp plus a process-monotonic counter. Every claim gets a fresh
 * name, so a retried or concurrent operation can never write into a file an
 * earlier owner still holds.
 */
function nextOperationId(): string {
  operationSequence += 1;
  return `${Date.now().toString(36)}-${operationSequence.toString(36)}`;
}

/**
 * Returns the cache-scoped directory for one owner and artifact kind,
 * creating it idempotently on demand. Per-account scoping lets auth cleanup
 * sweep one signed-out user's leftovers without touching another account's
 * actively owned files.
 */
function ensureAccountDirectory(kind: string, ownerId: string): Directory {
  const directory = new Directory(Paths.cache, PRIVATE_ARTIFACT_ROOT, kind, safeId(ownerId));
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

/** Deletes a file ignoring failures; survivors are swept by the janitor. */
function deleteFileQuietly(file: File): void {
  try {
    file.delete();
  } catch {
    // A concurrent release, an OS cache eviction, or a locked file is benign.
    // The janitor retries any surviving artifact at the next lifecycle boundary.
  }
}

/**
 * Registers module ownership of one exact destination URI and freezes it into
 * a lease. Ownership is the URI-to-symbol map entry itself: the janitor skips
 * any claimed file, and release() refuses to delete once a different symbol
 * holds the URI, so a stale continuation cannot remove a successor's file.
 */
function claimFile(file: File): OwnedPrivateFile {
  const owner = Symbol('private-artifact-owner');
  const uri = file.uri;
  activeFileOwners.set(uri, owner);
  return Object.freeze({
    file,
    isCurrent: () => activeFileOwners.get(uri) === owner,
    release: () => {
      const currentOwner = activeFileOwners.get(uri);
      // A stale continuation must never remove a successor that deliberately
      // took ownership of the same destination.
      if (currentOwner !== undefined && currentOwner !== owner) return;
      activeFileOwners.delete(uri);
      // Retry deletion even after an earlier release. Android can briefly
      // recreate a partial destination while an aborted download unwinds.
      deleteFileQuietly(file);
    },
  });
}

/**
 * Claims a fresh playback destination for one retained-recording download.
 * The validated recording id plus the operation suffix make the name unique,
 * so retries and remounts never reuse a path an earlier owner holds; unmapped
 * content types fall back to a generic extension instead of failing.
 */
export function claimPrivatePlaybackFile(
  ownerId: string,
  recordingId: string,
  contentType: string,
): OwnedPrivateFile {
  const directory = ensureAccountDirectory(PLAYBACK_DIRECTORY, ownerId);
  const extension = PLAYBACK_EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'audio';
  const filename = `${safeId(recordingId)}--${nextOperationId()}.${extension}`;
  return claimFile(new File(directory, filename));
}

/**
 * Claims a fresh JSON destination for one account data export. The
 * operation-scoped filename keeps retried or concurrent exports of the same
 * owner isolated from each other.
 */
export function claimPrivateExportFile(ownerId: string): OwnedPrivateFile {
  const directory = ensureAccountDirectory(EXPORT_DIRECTORY, ownerId);
  return claimFile(new File(directory, `account-data--${nextOperationId()}.json`));
}

/** Returns an Error named 'AbortError' so callers classify cancellation, not failure. */
function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/** Downloads only into an actively owned, cache-scoped destination. */
export async function downloadPrivatePlaybackFile(
  playbackUrl: string,
  artifact: OwnedPrivateFile,
  signal: AbortSignal,
): Promise<void> {
  try {
    if (signal.aborted || !artifact.isCurrent()) throw abortError();
    const downloaded = await File.downloadFileAsync(playbackUrl, artifact.file, {
      idempotent: false,
      signal,
    });
    if (signal.aborted || !artifact.isCurrent()) throw abortError();
    // A File destination must resolve to that exact destination. Refuse a
    // platform regression that could leave audio outside our managed tree.
    if (downloaded.uri !== artifact.file.uri) {
      deleteFileQuietly(downloaded);
      throw new Error('Playback downloaded outside its private destination.');
    }
  } catch (error) {
    artifact.release();
    throw error;
  }
}

/**
 * Recursively deletes every file under `directory` with no live module owner,
 * matched by exact URI. Actively claimed files are always skipped, so a
 * janitor run can never race an in-flight playback or share download; a
 * listing failure aborts the walk silently (best-effort by contract).
 */
function deleteInactiveFiles(directory: Directory): void {
  let entries: (Directory | File)[];
  try {
    if (!directory.exists) return;
    entries = directory.list();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry instanceof Directory) {
      deleteInactiveFiles(entry);
      continue;
    }
    if (!activeFileOwners.has(entry.uri)) deleteFileQuietly(entry);
  }
}

/**
 * Sweeps exports written by pre-artifact-tree builds directly beneath
 * Paths.cache. Only the exact historical filename pattern is touched so
 * current cache neighbors are never disturbed.
 */
function deleteLegacyExportOrphans(): void {
  let entries: (Directory | File)[];
  try {
    const cacheDirectory = new Directory(Paths.cache);
    if (!cacheDirectory.exists) return;
    entries = cacheDirectory.list();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry instanceof File && LEGACY_EXPORT_FILENAME.test(entry.name)) {
      deleteFileQuietly(entry);
    }
  }
}

/**
 * Best-effort orphan janitor for process-death leftovers.
 *
 * With an owner ID it touches only that account's playback/export areas.
 * Without one it walks the dedicated root. Live in-process leases are always
 * skipped, so a provider remount cannot remove a file an active surface owns.
 */
export async function cleanupPrivateArtifacts(ownerId?: string): Promise<void> {
  // Builds before the dedicated artifact tree wrote timestamped JSON directly
  // beneath Paths.cache. Sweep only that exact historical filename contract.
  deleteLegacyExportOrphans();
  if (ownerId === undefined) {
    deleteInactiveFiles(new Directory(Paths.cache, PRIVATE_ARTIFACT_ROOT));
    return;
  }
  let safeOwner: string;
  try {
    safeOwner = safeId(ownerId);
  } catch {
    return;
  }
  deleteInactiveFiles(
    new Directory(Paths.cache, PRIVATE_ARTIFACT_ROOT, PLAYBACK_DIRECTORY, safeOwner),
  );
  deleteInactiveFiles(
    new Directory(Paths.cache, PRIVATE_ARTIFACT_ROOT, EXPORT_DIRECTORY, safeOwner),
  );
}
