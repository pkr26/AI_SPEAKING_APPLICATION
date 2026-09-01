import { spawnSync } from 'node:child_process';

// Expo SDK 57's build/config graph currently resolves one upstream uuid
// advisory through xcode. The affected uuid v3/v5/v6 buffer-output APIs are
// not used by this app, and npm's offered fix is an incompatible downgrade to
// Expo 46 / expo-sharing 14. Keep CI strict: any new advisory ID, any high or
// critical issue, or growth beyond these 13 affected-chain nodes fails the
// build. react-native-google-mobile-ads depends on Expo and adds its direct
// package node to the same sole reviewed advisory chain; it introduces no new
// advisory ID and no high/critical advisory.
// Metro is pinned to the SDK-compatible 0.84.5 patch in package.json overrides;
// that removes the separately reviewed image-size denial-of-service advisories
// still present in React Native 0.86.2's older 0.84.4 lock resolution.
// GHSA-vcc3-ghjq-m6fr (1147955) flags decode-uri-component <=0.4.2 — every
// release of the package, so no override can fix it. It reaches the tree via
// expo-router's query-string@7.1.3. The registered aienglishcoach:// deep-link
// scheme means an attacker-crafted link CAN reach that parsing (not only this
// app's own router URLs), so the honest exposure is a client-side
// denial-of-service of one victim's app — the same upstream-Expo DoS class as
// the image-size precedent above, at moderate severity. Accepted on
// 2026-09-01; RE-VIEW when decode-uri-component publishes a fixed release
// (then remove 1147955 from the set and drop the maximums back) or whenever
// the advisory is re-rated above moderate.
const reviewedAdvisories = new Set([1119441, 1147955]);
const reviewedMaximums = { moderate: 16, high: 0, total: 16 };

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(result.stderr || 'npm audit did not return valid JSON.');
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (!counts) {
  console.error('npm audit response did not include vulnerability totals.');
  process.exit(1);
}

const observedAdvisories = new Set();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === 'object' && cause !== null && Number.isInteger(cause.source)) {
      observedAdvisories.add(cause.source);
    }
  }
}

const unknownAdvisories = [...observedAdvisories].filter(
  (source) => !reviewedAdvisories.has(source),
);
const exceedsBaseline =
  counts.critical > 0 ||
  counts.moderate > reviewedMaximums.moderate ||
  counts.high > reviewedMaximums.high ||
  counts.total > reviewedMaximums.total;

if (unknownAdvisories.length > 0 || exceedsBaseline) {
  console.error(
    `Dependency audit exceeded the reviewed baseline: ${JSON.stringify({
      counts,
      unknownAdvisories,
    })}`,
  );
  process.exit(1);
}

console.warn(
  `Known upstream Expo/Metro audit baseline remains: ${counts.high} high, ${counts.moderate} moderate, ${counts.critical} critical.`,
);
