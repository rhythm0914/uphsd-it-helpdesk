/**
 * Shared date/time formatting utilities.
 *
 * All ticket timestamps are stored in the database as UTC (`timestamptz`
 * columns with `DEFAULT now()`). Display must explicitly convert to
 * Philippine time (Asia/Manila) so every user sees school-local timestamps
 * regardless of their device or server timezone settings. Never shift a
 * timestamp by adding/subtracting hours — always format with an explicit
 * timeZone.
 */
export const DISPLAY_TIME_ZONE = "Asia/Manila";

/** "August 28, 2026, 2:39:33 PM" in Asia/Manila. */
export function formatDateTime(timestamp: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

/** "Aug 28, 2026" in Asia/Manila (date-only display). */
export function formatDate(timestamp: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}
