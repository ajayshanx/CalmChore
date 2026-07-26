// Generates the scheduled_date list for a new chore's instances. Kept
// intentionally simple for the first cut of recurrence: fixed daily/weekly/
// monthly cadence only ("Set Manually" custom recurrence from the spec is
// deferred). Capped so a parent can't accidentally generate years of
// instances in one submit.
const MAX_INSTANCES = 60;
const DEFAULT_DAILY_COUNT = 30;
const DEFAULT_WEEKLY_COUNT = 12;
const DEFAULT_MONTHLY_COUNT = 12;

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

export function generateInstanceDates(params: {
  recurrenceType: RecurrenceType;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  count?: number | null;
}): string[] {
  const { recurrenceType, startDate, endDate, count } = params;
  const start = new Date(`${startDate}T00:00:00Z`);

  if (recurrenceType === "none") {
    return [toDateOnly(start)];
  }

  const stepDays = recurrenceType === "daily" ? 1 : recurrenceType === "weekly" ? 7 : null;
  const defaultCount =
    recurrenceType === "daily"
      ? DEFAULT_DAILY_COUNT
      : recurrenceType === "weekly"
        ? DEFAULT_WEEKLY_COUNT
        : DEFAULT_MONTHLY_COUNT;

  const maxCount = Math.min(count ?? defaultCount, MAX_INSTANCES);
  const end = endDate ? new Date(`${endDate}T00:00:00Z`) : null;

  const dates: string[] = [];
  let current = start;
  for (let i = 0; i < maxCount; i++) {
    if (end && current > end) break;
    dates.push(toDateOnly(current));
    current = stepDays ? addDays(current, stepDays) : addMonths(current, 1);
  }
  return dates;
}
