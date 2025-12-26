import { format, parseISO } from "date-fns";

/**
 * Returns today's date in local timezone as YYYY-MM-DD string.
 * Use this for NEW forms/records where you want the current date.
 */
export function todayLocalISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Formats a Date object as YYYY-MM-DD string in local timezone.
 */
export function formatLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parses an ISO date string and returns YYYY-MM-DD format.
 * Preserves the date as-is (no timezone reinterpretation).
 * Use this when you have an existing date string from the server.
 */
export function formatISODate(isoString: string): string {
  if (!isoString) return "";
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    return isoString;
  }
  // For full ISO strings, parse and format
  return format(parseISO(isoString), "yyyy-MM-dd");
}
