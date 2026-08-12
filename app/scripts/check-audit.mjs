import { spawnSync } from "node:child_process";

// Expo SDK 57 currently resolves three upstream advisories through its
// build/Metro toolchain. Keep CI strict without applying npm's incompatible
// Expo 53 / React Native 0.72 downgrade: any new advisory ID, critical issue,
// or increase over this reviewed transitive graph fails the build.
// @testing-library/react-native is a devDependency but is marked devOptional
// (an optional peer elsewhere in the graph), so npm audit --omit=dev still
// counts it as one extra node affected by the same reviewed react-native
// advisories — no new advisory IDs.
const reviewedAdvisories = new Set([1119441, 1138808, 1138809]);
const reviewedMaximums = { moderate: 7, high: 15, total: 22 };

const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(result.stderr || "npm audit did not return valid JSON.");
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (!counts) {
  console.error("npm audit response did not include vulnerability totals.");
  process.exit(1);
}

const observedAdvisories = new Set();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const cause of vulnerability.via ?? []) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      Number.isInteger(cause.source)
    ) {
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
