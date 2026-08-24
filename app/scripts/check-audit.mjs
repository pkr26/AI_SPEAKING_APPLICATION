import { spawnSync } from 'node:child_process';

// Expo SDK 57's build/config graph currently resolves one upstream uuid
// advisory through xcode. The affected uuid v3/v5/v6 buffer-output APIs are
// not used by this app, and npm's offered fix is an incompatible downgrade to
// Expo 46 / expo-sharing 14. Keep CI strict: any new advisory ID, any high or
// critical issue, or growth beyond these 12 transitive nodes fails the build.
// Metro is pinned to the SDK-compatible 0.84.5 patch in package.json overrides;
// that removes the separately reviewed image-size denial-of-service advisories
// still present in React Native 0.86.2's older 0.84.4 lock resolution.
const reviewedAdvisories = new Set([1119441]);
const reviewedMaximums = { moderate: 12, high: 0, total: 12 };

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
