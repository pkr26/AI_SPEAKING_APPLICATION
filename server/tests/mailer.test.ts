import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import { addressIsPublicOrLoopback, sendMail } from '../src/mailer';
import { config } from '../src/config';
import { logger } from '../src/logger';
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

describe('webhook target address policy', () => {
  it('allows public unicast and loopback targets', () => {
    for (const address of [
      '203.0.113.10',
      '8.8.8.8',
      '192.0.2.1',
      '127.0.0.1',
      '127.255.0.9',
      '2606:4700::1111',
      '::1',
      '::ffff:8.8.8.8',
      '::ffff:127.0.0.1',
      '64:ff9b::8.8.8.8',
    ]) {
      expect(addressIsPublicOrLoopback(address), address).toBe(true);
    }
  });

  it('refuses private, link-local, CGNAT, unique-local, and unspecified targets', () => {
    for (const address of [
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::',
      '::ffff:10.0.0.1',
      '::ffff:192.168.0.1',
      '64:ff9b::10.0.0.1',
      'ff02::1',
      'not-an-address',
    ]) {
      expect(addressIsPublicOrLoopback(address), address).toBe(false);
    }
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
    await sendMail({ to: 'learner@example.com', subject: 'reset', text: 'code 123456' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
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
