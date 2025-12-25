import type { Duration } from "../market-generation-schemas";

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_MONTH = 30 * MS_PER_DAY;
export const RESOLUTION_BUFFER_HOURS = 6;

export function calculateDurationMs(duration: Duration): number {
  switch (duration.unit) {
    case "hours":
      return duration.value * MS_PER_HOUR;
    case "days":
      return duration.value * MS_PER_DAY;
    case "months":
      return duration.value * MS_PER_MONTH;
    default:
      throw new Error(`Invalid duration unit: ${duration.unit}`);
  }
}

export function calculateMarketDates(
  duration: Duration,
  now: Date = new Date()
): { votingEndsAt: Date; resolutionDeadline: Date } {
  const durationMs = calculateDurationMs(duration);
  const votingEndsAt = new Date(now.getTime() + durationMs);
  const resolutionDeadline = new Date(
    votingEndsAt.getTime() + RESOLUTION_BUFFER_HOURS * MS_PER_HOUR
  );

  return { votingEndsAt, resolutionDeadline };
}
