export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

// "Today" as understood in a specific IANA timezone (the family's stored
// timezone — see families.timezone), not the server's own UTC clock. Day/week
// boundaries are meant to follow the family's timezone regardless of where
// the server runs or which timezone a child is currently logging in from —
// see "Timezone" in "Calm Chore Setup.txt". Falls back to server-UTC "today"
// if the stored value isn't a valid IANA zone.
export function todayStrInTimezone(timezone: string | null | undefined): string {
  try {
    // en-CA formats as YYYY-MM-DD, which lines up with the rest of this file.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return todayStr();
  }
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

export function addMonthsStr(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toDateStr(d);
}

// Sunday-start week containing dateStr, returned as [weekStart, weekEnd] (both YYYY-MM-DD).
export function weekRange(dateStr: string): [string, string] {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const weekday = d.getUTCDay();
  const start = addDaysStr(dateStr, -weekday);
  const end = addDaysStr(start, 6);
  return [start, end];
}

// Monday of the Mon-Sun week containing dateStr — deliberately separate from
// weekRange() above (which is Sunday-start, for the Calendar UI). The Weekly
// Streak Bonus and Chore Freeze weekly cap are both explicitly spec'd
// against a Monday-Sunday week ("Child Login Options.txt"), independent of
// how the calendar displays weeks.
export function mondayWeekStart(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  const offsetFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDaysStr(dateStr, -offsetFromMonday);
}

export function monthRange(dateStr: string): [string, string] {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return [start, end];
}

export function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekLabel(dateStr: string): string {
  const [start, end] = weekRange(dateStr);
  const startLabel = new Date(`${start}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = new Date(`${end}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}
