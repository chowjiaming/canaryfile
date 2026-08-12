/**
 * Format an ISO calendar date ("2026-08-12") for display.
 * Correct version: parse as a calendar date, format in UTC so the
 * result never shifts with the machine's timezone.
 */
export function formatEventDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }