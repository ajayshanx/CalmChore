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

export type GeneratedSchedule = {
  dates: string[];
  // True when generation hit MAX_INSTANCES before satisfying the parent's
  // requested end date or count — i.e. the schedule was cut shorter than
  // what was actually asked for, not just capped by the (smaller) default.
  // createChore uses this to warn the parent their recurring chore's
  // schedule will need extending.
  truncated: boolean;
};

export function generateInstanceDates(params: {
  recurrenceType: RecurrenceType;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  count?: number | null;
}): GeneratedSchedule {
  const { recurrenceType, startDate, endDate, count } = params;
  const start = new Date(`${startDate}T00:00:00Z`);

  if (recurrenceType === "none") {
    return { dates: [toDateOnly(start)], truncated: false };
  }

  const stepDays = recurrenceType === "daily" ? 1 : recurrenceType === "weekly" ? 7 : null;
  const defaultCount =
    recurrenceType === "daily"
      ? DEFAULT_DAILY_COUNT
      : recurrenceType === "weekly"
        ? DEFAULT_WEEKLY_COUNT
        : DEFAULT_MONTHLY_COUNT;

  // An explicit end date (with no explicit count) should generate as many
  // occurrences as it takes to reach that date, bounded only by the safety
  // cap — not by the smaller "no end date given" default. Previously this
  // used `count ?? defaultCount` unconditionally, so a daily chore with only
  // an end date 90 days out silently stopped generating after the default
  // 30 instances despite `current` never having passed `end`.
  const maxCount = Math.min(count ?? (endDate ? MAX_INSTANCES : defaultCount), MAX_INSTANCES);
  const end = endDate ? new Date(`${endDate}T00:00:00Z`) : null;

  const dates: string[] = [];
  let current = start;
  let stoppedByDate = false;
  for (let i = 0; i < maxCount; i++) {
    if (end && current > end) {
      stoppedByDate = true;
      break;
    }
    dates.push(toDateOnly(current));
    current = stepDays ? addDays(current, stepDays) : addMonths(current, 1);
  }

  // "Truncated" means generation stopped because it hit the safety cap, not
  // because it satisfied the parent's own end date or count — i.e. there's
  // genuinely more owed than what got generated.
  const exhaustedIterations = !stoppedByDate && dates.length === maxCount;
  const cappedBySafetyLimit = maxCount === MAX_INSTANCES;
  const trueDemandExceedsCap = count != null ? count > MAX_INSTANCES : end !== null && current <= end;
  const truncated = exhaustedIterations && cappedBySafetyLimit && trueDemandExceedsCap;

  return { dates, truncated };
}
