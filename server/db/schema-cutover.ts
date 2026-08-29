/**
 * Migration 023 changes recording deletion from physical removal to logical
 * generation hiding. A pre-023 binary would not apply that visibility rule,
 * so the migration inserts this deliberately out-of-band manifest row. Its
 * `000_` name sorts before every real migration: old readiness code sees a
 * prefix mismatch and leaves the load balancer, while current code verifies
 * and removes the fence before comparing the ordinary migration manifest.
 */
export const RECORDING_PRIVACY_CUTOVER = Object.freeze({
  requiredMigration: '023_recording_bulk_cleanup.sql',
  name: '000_runtime_cutover_recording_privacy_v1',
  checksum: 'be0c62a55ec237f07b088798529ac1e27318fbfcd4a079712c79a183028b8a1c',
});
