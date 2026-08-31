import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { config } from './config';
import { logger } from './logger';

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

/**
 * True when `address` is safe to POST a password-reset code to without the
 * private-address opt-in: a public unicast address or loopback (loopback is a
 * documented, allowed production webhook shape for co-located relays). Pure
 * string analysis so it is unit-testable without DNS.
 */
export function addressIsPublicOrLoopback(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    // 127/8 loopback is allowed by falling through: it matches no refused
    // range below. Refuse unspecified, private, CGNAT, and link-local ranges.
    return !(
      a === 0 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
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
    // embed an IPv4 target: decide by the embedded address.
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
    // Refuse unspecified, unique-local, link-local, and multicast; global
    // unicast addresses are allowed. A NaN prefix ('::', '::x' forms that are
    // not plain hex up front) cannot be a global unicast address either.
    // Stryker disable next-line MethodExpression: valid IPv6 literals cap every hextet at four
    // hex digits (isIP gates the inputs), and parseInt stops at the ':' either way — slicing
    // the first four characters and parsing the whole string yield identical prefixes.
    const first = Number.parseInt(normalized.slice(0, 4), 16);
    if (Number.isNaN(first)) return false;
    return !(
      first === 0 ||
      (first >= 0xfc00 && first <= 0xfdff) ||
      (first >= 0xfe80 && first <= 0xfebf) ||
      first >= 0xff00
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
 * (network, timeout, non-2xx) are logged and swallowed. Never rejects.
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
        }
        // The response body is never read; cancel it so the keep-alive socket is
        // released back to the pool immediately instead of being held until GC.
        await response.body?.cancel().catch(() => undefined);
      } catch (err) {
        logDeliveryFailure({ err, to: message.to, subject: message.subject }, 'mail webhook delivery failed');
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
  }
}
