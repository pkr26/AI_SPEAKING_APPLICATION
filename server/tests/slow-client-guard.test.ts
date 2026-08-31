import { EventEmitter } from 'events';
import { createServer, type Server as HttpServer } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_ASSEMBLY_TIMEOUT_MS, IDLE_SOCKET_GUARD_MS, installSlowClientGuards } from '../src/slow-client-guard';

class FakeSocket extends EventEmitter {
  timeoutMs: number | null = null;
  destroyed = false;
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }
  destroy(): void {
    this.destroyed = true;
    this.emit('close');
  }
}

class FakeServer extends EventEmitter {
  emitConnection(socket: FakeSocket): void {
    this.emit('connection', socket);
  }
  emitRequest(socket: FakeSocket): EventEmitter {
    const res = new EventEmitter();
    Object.defineProperty(res, 'socket', { value: socket });
    this.emit('request', new EventEmitter(), res);
    return res;
  }
}

describe('installSlowClientGuards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('arms the idle-socket timeout on every connection', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    expect(socket.timeoutMs).toBe(IDLE_SOCKET_GUARD_MS);
  });

  it('destroys a socket that stalls mid-header-line (silent slowloris)', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\nHost: x\r\nX-Held: 1'));
    expect(socket.destroyed).toBe(false);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS - 1);
    expect(socket.destroyed).toBe(false);
    vi.advanceTimersByTime(2);
    expect(socket.destroyed).toBe(true);
  });

  it('never extends the header deadline when bytes keep dribbling in', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\n'));
    // A classic dribbling slowloris sends one partial header byte at a time;
    // 40 one-second dribbles reach far past the 35s first-byte deadline.
    for (let i = 0; i < 40; i++) {
      vi.advanceTimersByTime(1_000);
      socket.emit('data', Buffer.from('x'));
    }
    expect(socket.destroyed).toBe(true);
  });

  it('clears the header deadline once the parser completes the request', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\nHost: x\r\nX-Held: 1'));
    server.emitRequest(socket);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS * 3);
    expect(socket.destroyed).toBe(false);
  });

  it('does not arm a new deadline for the chunk that completed a request', () => {
    const server = new FakeServer();
    // Deferred reset runs after the completing chunk's data listener, matching
    // setImmediate-before-next-I/O ordering on real sockets.
    const deferred: Array<() => void> = [];
    installSlowClientGuards(server, { deferRequestCompletionReset: (reset) => deferred.push(reset) });
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\nHost: x\r\n\r\n'));
    server.emitRequest(socket);
    socket.emit('data', Buffer.from('same chunk tail'));
    expect(deferred.length).toBe(1);
    deferred.splice(0).forEach((reset) => reset());
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS * 3);
    expect(socket.destroyed).toBe(false);
  });

  it('keeps serving sockets alive across idle-socket timeouts (long assessments)', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    server.emitRequest(socket);
    vi.advanceTimersByTime(IDLE_SOCKET_GUARD_MS * 2);
    socket.emit('timeout');
    expect(socket.destroyed).toBe(false);
  });

  it('destroys an idle socket only after its response closed (parked after a request)', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    const res = server.emitRequest(socket);
    vi.advanceTimersByTime(IDLE_SOCKET_GUARD_MS * 2);
    socket.emit('timeout');
    expect(socket.destroyed).toBe(false);
    res.emit('close');
    socket.emit('timeout');
    expect(socket.destroyed).toBe(true);
  });

  it('re-arms the header deadline for a new request on a reused keep-alive socket', () => {
    const server = new FakeServer();
    const deferred: Array<() => void> = [];
    installSlowClientGuards(server, { deferRequestCompletionReset: (reset) => deferred.push(reset) });
    const socket = new FakeSocket();
    server.emitConnection(socket);
    server.emitRequest(socket);
    deferred.splice(0).forEach((reset) => reset());
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\nHost: x\r\nX-Held: 1'));
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS + 1);
    expect(socket.destroyed).toBe(true);
  });

  it('never destroys a socket that never sent anything before its first request', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    server.emitRequest(socket);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS * 2);
    expect(socket.destroyed).toBe(false);
  });

  it('schedules exactly one destroy timer per header phase regardless of dribbles', () => {
    const scheduled: unknown[][] = [];
    const server = new FakeServer();
    installSlowClientGuards(server, {
      scheduleDestroy: (socket, ms) => {
        scheduled.push([socket, ms]);
        return setTimeout(() => socket.destroy(), ms);
      },
    });
    const socket = new FakeSocket();
    server.emitConnection(socket);
    for (let i = 0; i < 5; i++) socket.emit('data', Buffer.from('x'));
    expect(scheduled.length).toBe(1);
    expect(scheduled[0][1]).toBe(HEADER_ASSEMBLY_TIMEOUT_MS);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS + 1);
    expect(socket.destroyed).toBe(true);
  });

  it('clears the header timer on socket close and on request completion', () => {
    const cleared: NodeJS.Timeout[] = [];
    const timers: NodeJS.Timeout[] = [];
    const resets: Array<() => void> = [];
    const server = new FakeServer();
    installSlowClientGuards(server, {
      scheduleDestroy: (socket, ms) => {
        const timer = setTimeout(() => socket.destroy(), ms);
        timers.push(timer);
        return timer;
      },
      clearSocketTimer: (timer) => {
        cleared.push(timer);
        clearTimeout(timer);
      },
      deferRequestCompletionReset: (reset) => resets.push(reset),
    });
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET / HTTP/1.1\r\nHost: x\r\nX-Held: 1'));
    server.emitRequest(socket);
    expect(cleared).toEqual([timers[0]]);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS * 2);
    expect(socket.destroyed).toBe(false);

    resets.splice(0).forEach((reset) => reset());
    socket.emit('data', Buffer.from('GET / HTTP/1.1\r\nX-Held: 2'));
    socket.emit('close');
    expect(cleared).toEqual([timers[0], timers[1]]);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS * 2);
    expect(socket.destroyed).toBe(false);
  });

  it('never invokes the clear spy when closing or completing a socket with no armed timer', () => {
    const cleared: NodeJS.Timeout[] = [];
    const server = new FakeServer();
    installSlowClientGuards(server, {
      clearSocketTimer: (timer) => cleared.push(timer),
    });
    const quiet = new FakeSocket();
    server.emitConnection(quiet);
    server.emitRequest(quiet);
    quiet.emit('close');
    expect(cleared).toEqual([]);
  });

  it('uses the default deferred reset: a later chunk re-arms the deadline', async () => {
    const scheduled: number[] = [];
    const server = new FakeServer();
    installSlowClientGuards(server, {
      scheduleDestroy: (socket, ms) => {
        scheduled.push(ms);
        return setTimeout(() => socket.destroy(), ms);
      },
    });
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET / HTTP/1.1\r\nHost: x\r\n\r\n'));
    server.emitRequest(socket);
    // setImmediate (the production default) must run before new socket data,
    // so the follow-up request's first chunk arms a SECOND timer (the first
    // was already cleared on request completion).
    await vi.advanceTimersByTimeAsync(0);
    socket.emit('data', Buffer.from('GET / HTTP/1.1\r\nX-Held: 9'));
    expect(scheduled.length).toBe(2);
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS + 1);
    expect(socket.destroyed).toBe(true);
  });

  it('skips request bookkeeping entirely when the response has no socket', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const res = new EventEmitter();
    Object.defineProperty(res, 'socket', { value: undefined });
    expect(() => server.emit('request', new EventEmitter(), res)).not.toThrow();
    expect(res.listenerCount('close')).toBe(0);
  });

  it('arms the idle timeout through the real connection path with default scheduling', () => {
    const server = new FakeServer();
    installSlowClientGuards(server);
    const socket = new FakeSocket();
    server.emitConnection(socket);
    socket.emit('data', Buffer.from('GET /health HTTP/1.1\r\nHost: x\r\nX-Held: 1'));
    // Default scheduleDestroy must both create and return a live timer: the
    // destroy still fires through the unmodified production path.
    vi.advanceTimersByTime(HEADER_ASSEMBLY_TIMEOUT_MS - 1);
    expect(socket.destroyed).toBe(false);
    vi.advanceTimersByTime(2);
    expect(socket.destroyed).toBe(true);
  });
});

describe('installSlowClientGuards on a real http server', () => {
  // The FakeSocket suite above cannot catch the interaction this block pins:
  // Node's own socketOnTimeout destroys a socket UNCONDITIONALLY on any socket
  // timeout when the server has no 'timeout' listener, which used to kill
  // legitimate in-flight first requests at the idle window. These tests use
  // real sockets and real timers (fake timers cannot drive node:net I/O) with
  // scaled-down injections of the module's timing options, mirroring the
  // real-socket style of rate-limit.test.ts.

  async function listen(server: HttpServer): Promise<AddressInfo> {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    return server.address() as AddressInfo;
  }

  async function closeServer(server: HttpServer): Promise<void> {
    server.closeAllConnections();
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  it('keeps a serving first-request socket alive past the idle window and delivers the late response', async () => {
    const server = createServer((_req, res) => {
      // Hold the connection's FIRST response open well past the injected idle
      // window: this is the exact shape Node's default socketOnTimeout destroy
      // used to cut mid-flight (a ~100s assessment chain against the 75s guard).
      setTimeout(() => res.end('slow-assessment-delivered'), 450);
    });
    installSlowClientGuards(server, { idleSocketGuardMs: 100, headerAssemblyTimeoutMs: 60_000 });
    const address = await listen(server);
    const client = connect(address.port, '127.0.0.1');
    try {
      const outcome = await new Promise<'delivered' | 'severed'>((resolve) => {
        let received = '';
        client.on('data', (chunk: Buffer) => {
          received += chunk.toString('latin1');
          if (received.includes('slow-assessment-delivered')) resolve('delivered');
        });
        client.once('error', () => resolve('severed'));
        client.once('close', () => resolve(received.includes('slow-assessment-delivered') ? 'delivered' : 'severed'));
        client.write('GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n');
      });
      expect(outcome).toBe('delivered');
    } finally {
      client.destroy();
      await closeServer(server);
    }
  }, 10_000);

  it('destroys a connected-but-silent socket around the idle window', async () => {
    const IDLE_GUARD_MS = 120;
    const server = createServer((_req, res) => res.end('unexpected-request'));
    installSlowClientGuards(server, { idleSocketGuardMs: IDLE_GUARD_MS, headerAssemblyTimeoutMs: 60_000 });
    const address = await listen(server);
    const client = connect(address.port, '127.0.0.1');
    try {
      const startedAt = Date.now();
      await new Promise<void>((resolve) => {
        client.once('close', resolve);
        client.once('error', resolve);
        // Deliberately never write any bytes: the socket stays idle.
      });
      const elapsed = Date.now() - startedAt;
      // Severed by the guard's own handler at the armed window — not earlier
      // (the no-op server 'timeout' listener never destroys on its own) and
      // not much later (nothing else bounds this socket).
      expect(elapsed).toBeGreaterThanOrEqual(IDLE_GUARD_MS - 30);
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      client.destroy();
      await closeServer(server);
    }
  }, 10_000);

  it('still severs an idle keep-alive socket after its response closed, via the keep-alive timer', async () => {
    const server = createServer((_req, res) => res.end('first-response-done'));
    // keepAliveTimeoutBuffer has a fixed +1s, so Node re-arms the socket
    // timeout to ~1.0s after the first response finishes — shorter than the
    // injected idle guard, exactly like production's 65s(+1s) vs 75s.
    server.keepAliveTimeout = 1;
    installSlowClientGuards(server, { idleSocketGuardMs: 10_000, headerAssemblyTimeoutMs: 60_000 });
    const address = await listen(server);
    const client = connect(address.port, '127.0.0.1');
    try {
      const severedAfterMs = await new Promise<number>((resolve, reject) => {
        const bail = setTimeout(() => reject(new Error('idle keep-alive socket was never severed')), 4_000);
        const startedAt = Date.now();
        let sawResponse = false;
        const settle = () => {
          clearTimeout(bail);
          if (sawResponse) resolve(Date.now() - startedAt);
          else reject(new Error('socket severed before the first response was delivered'));
        };
        client.on('data', (chunk: Buffer) => {
          if (chunk.toString('latin1').includes('first-response-done')) sawResponse = true;
        });
        client.once('close', settle);
        client.once('error', settle);
        client.write('GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n');
      });
      // The first response must have been delivered (the socket served it);
      // only then does the guard destroy the now-idle, non-serving socket when
      // Node's keep-alive timer fires.
      expect(severedAfterMs).toBeGreaterThanOrEqual(900);
      expect(severedAfterMs).toBeLessThan(3_500);
    } finally {
      client.destroy();
      await closeServer(server);
    }
  }, 10_000);

  it('destroys a real socket that dribbles a partial header line past the header deadline', async () => {
    const HEADER_DEADLINE_MS = 250;
    const server = createServer((_req, res) => res.end('unexpected-request'));
    installSlowClientGuards(server, { idleSocketGuardMs: 60_000, headerAssemblyTimeoutMs: HEADER_DEADLINE_MS });
    const address = await listen(server);
    const client = connect(address.port, '127.0.0.1');
    try {
      const startedAt = Date.now();
      const severedAfterMs = await new Promise<number>((resolve, reject) => {
        const bail = setTimeout(() => reject(new Error('dribbling socket was never destroyed')), 4_000);
        const settle = () => {
          clearTimeout(bail);
          resolve(Date.now() - startedAt);
        };
        client.once('close', settle);
        client.once('error', settle);
        client.write('GET /health HTTP/1.1\r\nHost: localhost\r\nX-Held: 1');
        // One dribble after the deadline was armed must not re-arm it.
        setTimeout(() => {
          try {
            client.write('x');
          } catch {
            // Already severed: settle has (or will) fire via close/error.
          }
        }, 100);
      });
      expect(severedAfterMs).toBeGreaterThanOrEqual(HEADER_DEADLINE_MS - 30);
      expect(severedAfterMs).toBeLessThan(2_000);
    } finally {
      client.destroy();
      await closeServer(server);
    }
  }, 10_000);
});
