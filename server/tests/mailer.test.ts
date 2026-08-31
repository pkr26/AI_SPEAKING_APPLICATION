import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import type { Counter } from 'prom-client';
import { addressIsPublicOrLoopback, sendMail } from '../src/mailer';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { mailerFailuresTotal } from '../src/metrics';
import { pool } from './helpers';

afterAll(async () => {
  await pool.end();
});

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

const savedMail = { ...config.mail };
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  Object.assign(config.mail, savedMail);
  vi.restoreAllMocks();
  vi.mocked(lookup).mockReset();
});

// Mirrors the counter observation helper in metrics.test.ts.
async function counterValue(counter: Counter<string>, labels: Record<string, string>): Promise<number> {
  const { values } = await counter.get();
  const match = values.find((entry) => Object.entries(labels).every(([key, value]) => entry.labels[key] === value));
  return match?.value ?? 0;
}

describe('webhook target address policy', () => {
  it('allows public unicast and loopback targets', () => {
    for (const address of [
      '203.0.113.10',
      '8.8.8.8',
      '1.1.1.1',
      '192.0.2.1',
      '127.0.0.1',
      '127.255.0.9',
      '2606:4700::1111',
      '2620:fe::fe',
      '::1',
      '::ffff:8.8.8.8',
      '::ffff:127.0.0.1',
      '64:ff9b::8.8.8.8',
    ]) {
      expect(addressIsPublicOrLoopback(address), address).toBe(true);
    }
  });

  it('refuses private, link-local, CGNAT, unique-local, unspecified, multicast, reserved, and site-local targets', () => {
    for (const address of [
      '10.1.2.3',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '100.127.255.255',
      '0.0.0.0',
      '0.1.2.3',
      // Multicast 224.0.0.0/4 (SSDP et al.) and the reserved 240.0.0.0/4 block,
      // broadcast included.
      '224.0.0.1',
      '239.255.255.250',
      '240.0.0.1',
      '255.255.255.255',
      // Benchmarking 198.18.0.0/15 and special-purpose 192.0.0.0/24.
      '198.18.0.1',
      '198.19.255.254',
      '192.0.0.1',
      'fe80::1',
      'febf::1',
      'fc00::1',
      'fd12:3456::1',
      'fdff::1',
      // Deprecated site-local fec0::/10 (fec0–feff).
      'fec0::1',
      'feff::1',
      // 6to4 (2002::/16) and Teredo (2001:0::/32): conservatively refused
      // rather than decoding their embedded IPv4 targets.
      '2002::1',
      '2001::1',
      '2001:0:db8::1',
      // RFC 8215 local-use NAT64 64:ff9b:1::/48.
      '64:ff9b:1::1234',
      '::',
      '0:1::9',
      '::ffff:10.0.0.1',
      '::ffff:192.168.1.1',
      '::ffff:224.0.0.1',
      '::ffff:10.20.30.40',
      '64:ff9b::10.0.0.1',
      '64:ff9b::172.16.5.5',
      'ff02::1',
      'ff00::1',
      'not-an-address',
    ]) {
      expect(addressIsPublicOrLoopback(address), address).toBe(false);
    }
  });

  it('treats the octet just outside every refused IPv4/IPv6 range as public', () => {
    // Boundary-exterior probes pin each range edge; a mutant that widens,
    // narrows, drops, or always-hits any range fails exactly one probe here.
    for (const address of [
      '172.15.255.255',
      '172.32.0.1',
      '192.167.1.1',
      '192.169.1.1',
      '169.253.1.1',
      '169.255.1.1',
      '100.63.255.255',
      '100.128.0.1',
      '11.0.0.1',
      '1.0.0.0',
      // Foreign first octets with a refused-range SECOND octet pin each range's
      // own class arm (a === 172/192/169/100): the arm must not fire for a
      // public class even when the second octet lands inside another range.
      '203.17.0.1',
      '203.168.0.1',
      '203.254.0.1',
      '203.64.0.1',
      // Just outside multicast 224.0.0.0/4, benchmarking 198.18.0.0/15, and
      // special-purpose 192.0.0.0/24 (whose 192.0.2.x TEST-NET neighbor stays
      // allowed, pinned above).
      '223.255.255.255',
      '198.17.255.255',
      '198.20.0.1',
      '192.0.1.1',
      'fbff::1',
      'fe00::1',
      'fe7f::1',
      // Just outside 6to4 2002::/16, Teredo 2001:0::/32 (nonzero second
      // hextet), and local-use NAT64 64:ff9b:1::/48 (third hextet ≠ 1).
      '2001:db8::1',
      '2003::1',
      '64:ff9b:2::1',
      '::ffff:123.45.67.89',
      '64:ff9b::123.45.67.89',
      // Embedded-IPv6 literals carrying the mapped/NAT64 marker mid-address
      // must NOT be treated as embedded: the marker is start-anchored.
      '1::ffff:10.0.0.1',
      '1:64:ff9b::10.0.0.1',
    ]) {
      expect(addressIsPublicOrLoopback(address), address).toBe(true);
    }
  });

  it('refuses embedded literals whose extracted quad is private even with multi-digit octets', () => {
    expect(addressIsPublicOrLoopback('64:ff9b::10.20.30.40')).toBe(false);
    expect(addressIsPublicOrLoopback('::ffff:172.16.5.5')).toBe(false);
  });

  it('delivers to a bracketed public IPv6 webhook literal', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://[2606:4700::1111]/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockImplementation(async (host) => ({ address: host, family: 6 }) as never);
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('never POSTs a reset code to a webhook host resolving to a private address', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.attacker.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '169.254.169.254', family: 4 });

    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'relay.attacker.example' }),
      'mail webhook host resolves to a private address; refusing delivery',
    );
  });

  it('unwraps IPv6 literals in webhook hostnames before judging the target', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://[fd12:3456::1]/send',
      webhookAllowPrivateAddress: false,
    });
    // lookup of a literal returns it unchanged; no fetch may happen.
    vi.mocked(lookup).mockImplementation(async (host) => ({ address: host, family: 6 }) as never);

    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('delivers when the host resolves publicly, and when the operator opts into private relays', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.internal/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '203.0.113.9', family: 4 });
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).toHaveBeenCalledOnce();

    Object.assign(config.mail, { webhookAllowPrivateAddress: true });
    vi.mocked(lookup).mockResolvedValue({ address: '10.0.0.5', family: 4 });
    vi.mocked(lookup).mockClear();
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // The documented opt-in skips the private-address check entirely: no DNS
    // resolution happens on the bypassed path.
    expect(vi.mocked(lookup)).not.toHaveBeenCalled();
  });

  it('lets an unresolvable host through to fetch, which owns network failure reporting', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://unresolvable.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockRejectedValue(new Error('ENOTFOUND'));
    // The guard lets an unresolvable host through; the fetch is what owns
    // reporting the network failure.
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.anything() }),
      'mail webhook delivery failed',
    );
  });
});

describe('mailer failure metrics', () => {
  it("counts a private-address refusal under reason='refused' without a fetch", async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.attacker.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '169.254.169.254', family: 4 });
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const before = await counterValue(mailerFailuresTotal, { reason: 'refused' });
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await counterValue(mailerFailuresTotal, { reason: 'refused' })).toBe(before + 1);
  });

  it("counts a non-2xx relay answer under reason='status'", async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '203.0.113.9', family: 4 });
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 502 }));
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const before = await counterValue(mailerFailuresTotal, { reason: 'status' });
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(await counterValue(mailerFailuresTotal, { reason: 'status' })).toBe(before + 1);
  });

  it("counts deadline aborts under reason='timeout' and transport faults under reason='network'", async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '203.0.113.9', family: 4 });
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    // AbortSignal.timeout() surfaces as a 'TimeoutError'-named rejection; other
    // transport faults (fetch failed, refused connection) are plain errors.
    fetchSpy
      .mockRejectedValueOnce(Object.assign(new TypeError('signal timed out'), { name: 'TimeoutError' }))
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    const timeoutBefore = await counterValue(mailerFailuresTotal, { reason: 'timeout' });
    const networkBefore = await counterValue(mailerFailuresTotal, { reason: 'network' });
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });

    expect(await counterValue(mailerFailuresTotal, { reason: 'timeout' })).toBe(timeoutBefore + 1);
    expect(await counterValue(mailerFailuresTotal, { reason: 'network' })).toBe(networkBefore + 1);
  });

  it("counts an unexpected exception under reason='exception' and still resolves", async () => {
    Object.assign(config.mail, { mode: 'log' });
    // In log mode the logger IS the delivery channel: a serializer fault is an
    // unexpected delivery exception, and the outer guard must both count it
    // and keep the never-throws contract.
    vi.spyOn(logger, 'info').mockImplementationOnce(() => {
      throw new Error('serializer exploded');
    });
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const before = await counterValue(mailerFailuresTotal, { reason: 'exception' });
    await expect(
      sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' }),
    ).resolves.toBeUndefined();

    expect(await counterValue(mailerFailuresTotal, { reason: 'exception' })).toBe(before + 1);
  });

  it('does not count successful deliveries', async () => {
    Object.assign(config.mail, {
      mode: 'webhook',
      webhookUrl: 'https://relay.example/send',
      webhookAllowPrivateAddress: false,
    });
    vi.mocked(lookup).mockResolvedValue({ address: '203.0.113.9', family: 4 });

    const before = (await mailerFailuresTotal.get()).values.reduce((sum, { value }) => sum + value, 0);
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect((await mailerFailuresTotal.get()).values.reduce((sum, { value }) => sum + value, 0)).toBe(before);
  });
});
