import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { config } from './config';
import { logger } from './logger';
import { recordMailerFailure, type MailerFailureReason } from './metrics';

/**
 * Outbound mail is best-effort by contract: password-reset responses are
 * always 204 regardless of delivery, so nothing here may ever throw into a
 * route. A webhook relay that hangs is cut off by a bounded timeout.
 */
const WEBHOOK_TIMEOUT_MS = 5_000;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

// Logging itself is an operational dependency. A transport/serializer fault
// must not turn this best-effort mail helper into a rejected promise (the
// caller intentionally dispatches it after returning a uniform reset response).
function logDeliveryFailure(payload: Record<string, unknown>, message: string): void {
  try {
    logger.error(payload, message);
  } catch {
    // The API must keep its no-throw mail-delivery contract even when logging
    // is impaired; the reset token is already durable and the caller has no
    // response distinction to expose.
  }
}

// Metrics share logging's never-throw contract: a registry fault must not turn
// best-effort mail delivery into a rejected promise either.
function recordFailure(reason: MailerFailureReason): void {
  try {
    recordMailerFailure(reason);
  } catch {
    // The counter is an operator signal only; losing one increment to a broken
    // registry beats breaking the no-throw delivery contract.
  }
}

/** Classifies a webhook transport rejection for the failure counter. */
function webhookFailureReason(err: unknown): MailerFailureReason {
  // AbortSignal.timeout() rejects with a DOMException named 'TimeoutError' and
  // manual aborts surface as 'AbortError': both mean the bounded deadline
  // fired, not that the relay answered badly.
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError') ? 'timeout' : 'network';
}

/**
 * True when `address` is safe to POST a password-reset code to without the
 * private-address opt-in: loopback (a documented, allowed production webhook
 * shape for co-located relays) or a globally routable unicast address. This is
 * deliberately an ALLOW-list — ordinary unicast and loopback are the only
 * permitted classes, every special-purpose range is refused exhaustively, and
 * input that classifies as neither (non-IP strings, unparseable prefixes) is
 * refused — so an unlisted range can never slip through as "probably public".
 * Pure string analysis so it is unit-testable without DNS.
 */
export function addressIsPublicOrLoopback(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    // Loopback 127/8 is the one special-purpose range deliberately allowed.
    if (a === 127) return true;
    // Everything else must be globally routable unicast. Refused: unspecified
    // 0/8, private 10/8 + 172.16/12 + 192.168/16, CGNAT 100.64/10, link-local
    // 169.254/16, special-purpose 192.0.0.0/24, benchmarking 198.18.0.0/15,
    // multicast 224.0.0.0/4 (SSDP et al.), and the entire reserved 240.0.0.0/4
    // block including the 255.255.255.255 broadcast.
    return !(
      a === 0 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && b >= 18 && b <= 19) ||
      a >= 224
    );
  }
  // Stryker disable next-line ConditionalExpression: with the condition forced true, non-IP
  // strings (the only other reachable family) fall into the IPv6 branch and return false via
  // the NaN-prefix guard — byte-identical to the function's fallthrough; family-4 inputs
  // return inside the branch above, and the false-mutant is killed by the IPv6 allow probes.
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::1') return true;
    // IPv4-mapped (::ffff:a.b.c.d) and well-known NAT64 (64:ff9b::a.b.c.d)
    // embed an IPv4 target: normalize it and decide under the IPv4 rules above.
    const embedded =
      // Stryker disable next-line Regex: dropping the trailing $ cannot change the verdict —
      // isIP() only admits literals where the dotted quad IS the tail, so an unanchored match
      // and an anchored match capture the identical text. The ^-removal and final-quantifier
      // mutants are killed by the 1::ffff:…, 0:64:ff9b::…, and 64:ff9b::123.45.67.10 probes.
      /^::ffff:((?:\d{1,3}\.){3}\d{1,3})$/.exec(normalized)?.[1] ??
      // Stryker disable next-line Regex: same tail-anchoring argument as the ::ffff: pattern;
      // the ^-removal and quantifier mutants are killed by dedicated probes.
      /^64:ff9b::((?:\d{1,3}\.){3}\d{1,3})$/.exec(normalized)?.[1];
    if (embedded) return addressIsPublicOrLoopback(embedded);
    // Hextet values before any '::' compression run. A prefix slot the head
    // does not reach is zero by construction (compression pads zeros directly
    // after it), so the prefix checks below may safely read [i] ?? 0.
    const head = (normalized.split('::')[0] ?? '').split(':').map((hextet) => Number.parseInt(hextet, 16));
    // Stryker disable next-line MethodExpression: valid IPv6 literals cap every hextet at
    // four hex digits (isIP gates the inputs), and parseInt stops at the first non-hex
    // character either way — parsing the hextet's text and parsing a four-character
    // slice of the whole literal yield identical prefixes.
    const first = head[0] ?? Number.NaN;
    if (Number.isNaN(first)) return false;
    // 6to4 (2002::/16) and Teredo (2001:0::/32) wrap an embedded IPv4 target.
    // Decoding the embedded address is deliberately NOT attempted: the
    // conservative option — refusing the whole prefix — cannot be undermined
    // by a decoder bug, and its only cost is refusing legitimately routed
    // 6to4/Teredo addresses, which have no business receiving reset codes.
    const teredo = first === 0x2001 && (head[1] ?? 0) === 0;
    // RFC 8215 local-use NAT64 (64:ff9b:1::/48) translates into an operator's
    // own network, not a public v4 target; the well-known 64:ff9b::/96 dotted
    // form was already judged by its embedded address above.
    const localUseNat64 = first === 0x64 && head[1] === 0xff9b && (head[2] ?? 0) === 1;
    // Globally routable IPv6 unicast passes. Refused instead: unspecified and
    // IPv4-compatible (::/… zero prefixes), unique-local fc00::/7, link-local
    // fe80::/10, deprecated site-local fec0::/10, multicast ff00::/8, and the
    // conservatively-refused translation prefixes computed above.
    return !(
      first === 0 ||
      (first >= 0xfc00 && first <= 0xfdff) ||
      (first >= 0xfe80 && first <= 0xfebf) ||
      (first >= 0xfec0 && first <= 0xfeff) ||
      first >= 0xff00 ||
      first === 0x2002 ||
      teredo ||
      localUseNat64
    );
  }
  return false;
}

// The webhook host is resolved and checked per send (not cached): fetch
// re-resolves on its own, so a cached verdict could not pin the connection it
// guards anyway. The check exists to refuse misconfigured/attacker-influenced
// private targets loudly, not to fully defeat DNS rebinding — that residual
// window is documented and accepted because the URL is operator config.
async function webhookHostAllowed(hostname: string): Promise<boolean> {
  // Stryker disable next-line ConditionalExpression,LogicalOperator,StringLiteral: hostnames
  // here come from MAIL_WEBHOOK_URL, which boot validation already parsed as a real URL —
  // stray brackets or unbalanced hosts cannot reach this line, and a wrong strip only turns a
  // resolvable host into an unresolvable one, whose documented outcome (allow, let fetch
  // report the failure) matches the original path's result.
  const bareHost = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  try {
    const { address } = await lookup(bareHost);
    return addressIsPublicOrLoopback(address);
  } catch {
    // Unresolvable host: let the fetch itself fail (and be logged) rather
    // than duplicating DNS error reporting here.
    return true;
  }
}

/**
 * Deliver one mail per the configured MAIL_MODE. 'log' writes the whole
 * message (including any embedded code) to the info log — dev/manual delivery.
 * 'webhook' POSTs {to, subject, text} as JSON to MAIL_WEBHOOK_URL; failures
 * (network, timeout, non-2xx, private-address refusal) are logged, counted in
 * mailer_failures_total, and swallowed. Never rejects.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  try {
    if (config.mail.mode === 'webhook') {
      try {
        const webhookUrl = new URL(config.mail.webhookUrl);
        // Unless the operator explicitly runs a co-located private relay, never
        // deliver reset codes to a resolved private/link-local target: this
        // turns a future attacker-influenced webhook URL into a loud refusal
        // instead of silent exfiltration into an internal network.
        if (!config.mail.webhookAllowPrivateAddress && !(await webhookHostAllowed(webhookUrl.hostname))) {
          logDeliveryFailure(
            { to: message.to, subject: message.subject, host: webhookUrl.hostname },
            'mail webhook host resolves to a private address; refusing delivery',
          );
          recordFailure('refused');
          return;
        }
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: message.to, subject: message.subject, text: message.text }),
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
          // The configured URL is security-validated, but fetch would otherwise
          // forward this POST (including password-reset codes) across a 307/308
          // redirect to an arbitrary or plaintext destination.
          redirect: 'error',
        });
        if (!response.ok) {
          logDeliveryFailure(
            { to: message.to, subject: message.subject, status: response.status },
            'mail webhook rejected',
          );
          recordFailure('status');
        }
        // The response body is never read; cancel it so the keep-alive socket is
        // released back to the pool immediately instead of being held until GC.
        await response.body?.cancel().catch(() => undefined);
      } catch (err) {
        logDeliveryFailure({ err, to: message.to, subject: message.subject }, 'mail webhook delivery failed');
        recordFailure(webhookFailureReason(err));
      }
      return;
    }
    // Deliberately at info level: log mode IS the delivery channel in dev, so
    // the operator must see the message text (the reset code lives in `text`,
    // which the logger's redaction allowlist does not touch).
    logger.info(
      { to: message.to, subject: message.subject, text: message.text },
      'mail delivered to log (MAIL_MODE=log)',
    );
  } catch (err) {
    logDeliveryFailure({ err, to: message.to, subject: message.subject }, 'mail delivery failed unexpectedly');
    recordFailure('exception');
  }
}
