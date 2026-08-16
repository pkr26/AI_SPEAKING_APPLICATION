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

/**
 * Deliver one mail per the configured MAIL_MODE. 'log' writes the whole
 * message (including any embedded code) to the info log — dev/manual delivery.
 * 'webhook' POSTs {to, subject, text} as JSON to MAIL_WEBHOOK_URL; failures
 * (network, timeout, non-2xx) are logged and swallowed. Never rejects.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (config.mail.mode === 'webhook') {
    try {
      const response = await fetch(config.mail.webhookUrl, {
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
        logger.error({ to: message.to, subject: message.subject, status: response.status }, 'mail webhook rejected');
      }
    } catch (err) {
      logger.error({ err, to: message.to, subject: message.subject }, 'mail webhook delivery failed');
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
}
