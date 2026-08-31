import type { IncomingMessage, ServerResponse } from 'http';
import type { Server, Socket } from 'net';

/**
 * Server-level slow-client guards for two stall shapes Node's own HTTP
 * timeouts do not cover (verified on Node 26): a socket that has received a
 * request line and then stalls forever inside an unterminated header line
 * fires neither `headersTimeout` nor `requestTimeout`, and a socket that
 * stalls after one completed (possibly pipelined) request is only bounded by
 * keep-alive semantics that do not apply mid-request. Both shapes hold a file
 * descriptor with no completed request, which the global rate limiter can
 * never see. A fronting proxy with its own header-read timeout remains the
 * primary defense (see AGENTS.md); these guards bound direct exposure.
 */
export const HEADER_ASSEMBLY_TIMEOUT_MS = 35_000;
export const IDLE_SOCKET_GUARD_MS = 75_000;

interface GuardedServerLike {
  on(event: 'connection', listener: (socket: Socket) => void): unknown;
  on(event: 'request', listener: (req: IncomingMessage, res: ServerResponse) => void): unknown;
}

interface GuardedSocketLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  setTimeout(timeout: number): unknown;
  destroy(): void;
}

export interface SlowClientGuardTiming {
  headerAssemblyTimeoutMs?: number;
  idleSocketGuardMs?: number;
  clearSocketTimer?: (timer: NodeJS.Timeout) => void;
  scheduleDestroy?: (socket: GuardedSocketLike, ms: number) => NodeJS.Timeout;
  /** Runs after the 'request'-carrying chunk finished delivering to listeners. */
  deferRequestCompletionReset?: (reset: () => void) => void;
}

/**
 * Install the two per-connection guards. Must be called before `listen()` so
 * no accepted connection can miss the listeners.
 *
 * - Idle guard: an idle-socket timeout that destroys the socket only while no
 *   request is being served on it. Idle keep-alive sockets are unaffected in
 *   practice because Node's own keepAliveTimeout (65s) is shorter than this
 *   guard; in-flight requests (whose whole-request budget reaches 130s) are
 *   exempt so a legitimate slow assessment is never cut mid-flight.
 * - Header-assembly deadline: destroyed `headerAssemblyTimeoutMs` after the
 *   first byte of a request whose headers never complete. Cleared the moment
 *   the parser emits 'request' (headers complete), so body transfer time is
 *   never charged against it.
 */
export function installSlowClientGuards(
  server: GuardedServerLike,
  {
    headerAssemblyTimeoutMs = HEADER_ASSEMBLY_TIMEOUT_MS,
    idleSocketGuardMs = IDLE_SOCKET_GUARD_MS,
    clearSocketTimer = clearTimeout,
    scheduleDestroy,
    deferRequestCompletionReset = (reset: () => void) => {
      setImmediate(reset);
    },
  }: SlowClientGuardTiming = {},
): void {
  // Weak structures keep the guards invisible to shutdown and leak-free once a
  // socket closes; no socket is ever iterable or retained by this module.
  const headerTimers = new WeakMap<GuardedSocketLike, NodeJS.Timeout>();
  const requestJustCompleted = new WeakSet<GuardedSocketLike>();
  const servingSockets = new WeakSet<GuardedSocketLike>();
  const schedule =
    scheduleDestroy ??
    ((socket: GuardedSocketLike, ms: number) => {
      const timer = setTimeout(() => socket.destroy(), ms);
      // Stryker disable next-line StringLiteral: unref() has no observable unit-test
      // behavior (it only removes the event-loop hold); every guard timer is also
      // cleared on request completion or socket close, and shutdown force-exits on
      // its own SHUTDOWN_DRAIN_MS budget, so the unref is defense in depth only.
      timer.unref();
      return timer;
    });

  server.on('connection', (socket) => {
    socket.setTimeout(idleSocketGuardMs);
    socket.on('timeout', () => {
      // In-flight requests are exempt (their budget is the request timeout);
      // everything else idle this long is a stalled or parked connection.
      if (!servingSockets.has(socket)) socket.destroy();
    });
    socket.on('data', () => {
      // The parser completed a request while processing this chunk: its bytes
      // cannot belong to a pending header line. The server's 'request'
      // listener runs before this passive 'data' listener for the same chunk
      // (http.Server registers its connection listener first), and the reset
      // runs before Node's poll phase delivers any new socket data, so a
      // follow-up request's first chunk re-arms the deadline correctly.
      if (requestJustCompleted.has(socket)) return;
      if (headerTimers.has(socket)) return;
      headerTimers.set(socket, schedule(socket, headerAssemblyTimeoutMs));
    });
    socket.on('close', () => {
      const timer = headerTimers.get(socket);
      if (timer) clearSocketTimer(timer);
      headerTimers.delete(socket);
    });
  });

  server.on('request', (_req, res) => {
    const socket = res.socket;
    if (!socket) return;
    servingSockets.add(socket);
    res.on('close', () => servingSockets.delete(socket));
    const timer = headerTimers.get(socket);
    if (timer) {
      clearSocketTimer(timer);
      headerTimers.delete(socket);
    }
    // Headers are complete: bytes of this chunk cannot belong to a pending
    // header line (a pipelined partial follow-up request is covered by the
    // idle guard instead).
    requestJustCompleted.add(socket);
    deferRequestCompletionReset(() => requestJustCompleted.delete(socket));
  });
}

/** Exposed for index.ts wiring; the real server satisfies both shapes. */
export type SlowClientGuardServer = Server;
