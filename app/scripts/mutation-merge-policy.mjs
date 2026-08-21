import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const mutationMergePolicySchemaVersion = 1;

/**
 * Inputs that decide whether lane reports pass the strict app gate. The app
 * summary pins their exact contents. Membership here does not imply that an
 * input is safe to exclude from execution provenance: the Recorder runner also
 * imports helpers from the app merger while publishing its canonical report.
 * The reviewed-equivalence registry is the policy-only input.
 */
export const mutationMergePolicyFiles = Object.freeze([
  'scripts/merge-mutation-reports.mjs',
  'scripts/mutation-equivalents.mjs',
  'scripts/mutation-merge-policy.mjs',
]);

/** Build a deterministic, reviewable fingerprint of the active app merge policy. */
export async function createMutationMergePolicyProvenance({ appDir }) {
  if (typeof appDir !== 'string' || appDir.length === 0) {
    throw new Error('appDir must be a non-empty string');
  }

  const files = [...new Set(mutationMergePolicyFiles)].toSorted();
  const hash = createHash('sha256');
  hash.update(`${JSON.stringify({ schemaVersion: mutationMergePolicySchemaVersion, files })}\n`);
  for (const fileName of files) {
    const contents = await fs.readFile(path.join(appDir, fileName));
    hash.update(`${fileName}\0${contents.byteLength}\0`);
    hash.update(contents);
    hash.update('\0');
  }

  return Object.freeze({
    schemaVersion: mutationMergePolicySchemaVersion,
    files: Object.freeze(files),
    fingerprint: hash.digest('hex'),
  });
}
