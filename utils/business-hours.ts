// Business-hours arithmetic for the UPHSD IT Help Desk.
//
// The help desk works Monday to Friday, 08:00-17:00 Asia/Manila. The
// Philippines has no daylight saving time, so a fixed +08:00 offset is exact
// and no timezone library is needed.
//
// Every function takes and returns epoch milliseconds so the callers (and the
// tests) can pin the clock. Nothing here reads the current time.

export const BUSINESS_TIMEZONE = "Asia/Manila";

/** Asia/Manila is UTC+08:00 all year. */
const OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const BUSINESS_OPEN_MINUTE = 8 * 60; // 08:00
export const BUSINESS_CLOSE_MINUTE = 17 * 60; // 17:00
export const BUSINESS_DAY_MINUTES = BUSINESS_CLOSE_MINUTE - BUSINESS_OPEN_MINUTE; // 540

interface LocalParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  minuteOfDay: number;
}

/** Read an instant as Manila wall-clock parts. */
function localParts(ms: number): LocalParts {
  const shifted = new Date(ms + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minuteOfDay:
      shifted.getUTCHours() * 60 + shifted.getUTCMinutes() + shifted.getUTCSeconds() / 60,
  };
}

/** Epoch ms for a Manila wall-clock date at a given minute-of-day. */
function localInstant(p: LocalParts, minuteOfDay: number): number {
  return Date.UTC(p.year, p.month, p.day) - OFFSET_MS + minuteOfDay * 60 * 1000;
}

export function isBusinessDay(ms: number): boolean {
  const weekday = localParts(ms).weekday;
  return weekday >= 1 && weekday <= 5;
}

export function isWithinBusinessHours(ms: number): boolean {
  if (!isBusinessDay(ms)) return false;
  const { minuteOfDay } = localParts(ms);
  return minuteOfDay >= BUSINESS_OPEN_MINUTE && minuteOfDay < BUSINESS_CLOSE_MINUTE;
}

/**
 * The first working instant at or after `ms`.
 *
 * Inside business hours this is `ms` itself; otherwise it is the next weekday
 * at 08:00.
 */
export function nextBusinessStart(ms: number): number {
  if (isWithinBusinessHours(ms)) return ms;

  const p = localParts(ms);
  let candidate = localInstant(p, BUSINESS_OPEN_MINUTE);
  // Before opening we are already at the right day's 08:00; at or after
  // closing (or on a weekend) we must move forward.
  if (ms >= candidate) candidate += DAY_MS;

  while (!isBusinessDay(candidate)) candidate += DAY_MS;
  return candidate;
}

/** Add `minutes` of working time, skipping evenings and weekends. */
export function addBusinessMinutes(startMs: number, minutes: number): number {
  if (minutes <= 0) return nextBusinessStart(startMs);

  let remaining = minutes;
  let cursor = nextBusinessStart(startMs);

  // Each iteration consumes at most one working day, so this terminates.
  while (remaining > 0) {
    const p = localParts(cursor);
    const endOfDay = localInstant(p, BUSINESS_CLOSE_MINUTE);
    const available = (endOfDay - cursor) / 60_000;

    if (remaining <= available) return cursor + remaining * 60_000;

    remaining -= available;
    cursor = nextBusinessStart(endOfDay);
  }

  return cursor;
}

/**
 * Add `days` working days, preserving the time of day.
 *
 * A due date is a promise ("3 business days from now"), so the clock time is
 * kept and only weekends are skipped.
 */
export function addBusinessDays(startMs: number, days: number): number {
  let cursor = nextBusinessStart(startMs);
  let added = 0;

  while (added < days) {
    const p = localParts(cursor);
    let next = localInstant(p, p.minuteOfDay) + DAY_MS;
    while (!isBusinessDay(next)) next += DAY_MS;
    cursor = next;
    added += 1;
  }

  return cursor;
}

/** Whole working days between two instants (deadline maths, not an SLA clock). */
export function businessDaysBetween(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  let count = 0;
  let cursor = fromMs;
  while (cursor < toMs) {
    if (isBusinessDay(cursor)) count += 1;
    cursor += DAY_MS;
  }
  return count;
}
