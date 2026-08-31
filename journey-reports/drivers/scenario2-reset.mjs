// Scenario 2 addendum: complete the forgot-password reset using the code the
// dev mailer wrote to the server log (MAIL_MODE=log).
import { readFileSync } from 'node:fs';
import { note, resetSteps, step } from './lib.mjs';

resetSteps();
const LOG = '/Users/pavankumarreddyreddem/.zcode/cli/exec/sess_eccc4aad-e5d5-4459-a00c-cee780d9cec6/call_ad4ac10b17604d07a15d6055-stdout.log';
const identity = JSON.parse(readFileSync('/tmp/journey/userB.json', 'utf8'));
const email = identity.email;

const text = readFileSync(LOG, 'utf8');
const lines = text.split('\n');
let code = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(email) && /reset code/.test(lines.slice(i, i + 3).join(' '))) {
    const m = lines.slice(i, i + 3).join(' ').match(/reset code is ([0-9a-f]{32})/);
    if (m) code = m[1];
  }
}
note(`reset code for ${email}: ${code}`);

await step('Reset my password with the emailed code', 'POST', '/auth/reset-password', {
  json: { email, token: code, newPassword: 'resetpass1' },
});
await step('Old session token is revoked after the password reset', 'GET', '/auth/me', { token: identity.token });
const relog = await step('Sign in with the NEW password', 'POST', '/auth/login', { json: { email, password: 'resetpass1' } });
await step('Placement is still pending after the reset (state survives)', 'GET', '/diagnostic/next', { token: relog.body.token });
