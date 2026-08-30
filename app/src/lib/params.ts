/** Helpers for validating expo-router URL parameters. */

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isUuid(value: string | undefined): value is string {
  // Type-guard first: RegExp.test coerces its argument, so a hostile object
  // whose toString/valueOf are non-callable (a corrupted durable blob passed
  // through parsePendingAssessment) would otherwise throw a TypeError instead
  // of letting the caller reject the record.
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
