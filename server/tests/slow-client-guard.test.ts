import { EventEmitter } from 'events';
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
