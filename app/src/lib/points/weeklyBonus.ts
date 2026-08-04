import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysStr } from "@/lib/chores/calendarDates";

// The Weekly Streak Bonus is explicitly spec'd against a Monday-Sunday week
// ("Child Login Options.txt"), which is deliberately different from the
// Sunday-start week the Calendar UI uses for display (see weekRange() in
// calendarDates.ts) — keep these separate rather than repurposing one for
// the other.
function mondayWeekStart(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  const offsetFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDaysStr(dateStr, -offsetFromMonday);
}

// Call whenever a child's streak has just been extended to cover a Sunday —
// that's the only moment a Mon-Sun week can have just become "complete".
// `streakStartedDate` should be the streak's start date as of AFTER
// whatever update just landed (unchanged for a plain extension, or equal to
// `weekSunday` itself for a brand-new/just-reset streak).
export async function maybeAwardWeeklyStreakBonus(
  supabase: SupabaseClient,
  childId: string,
  weekSunday: string,
  streakStartedDate: string
) {
  const weekMonday = mondayWeekStart(weekSunday);

  const { data: child } = await supabase
    .from("children")
    .select("created_at")
    .eq("id", childId)
    .maybeSingle();
  const createdDateStr = child?.created_at ? String(child.created_at).slice(0, 10) : weekMonday;

  // Days before the child's account existed aren't "required" — a child
  // added mid-week only needs their creation date through Sunday covered
  // for that first partial week to qualify, not the days before they had an
  // account at all.
  const requiredWeekStart = createdDateStr > weekMonday ? createdDateStr : weekMonday;

  // The current unbroken streak needs to reach back at least to the start
  // of what was required this week. If it starts later than that (inside
  // this same week), a gap ate part of the week and it doesn't qualify —
  // this naturally falls out of how the streak is only ever extended one
  // consecutive day at a time (see validateChoreAssignment).
  if (streakStartedDate > requiredWeekStart) {
    return;
  }

  const description = `Weekly Streak Bonus (week of ${weekMonday})`;

  // Idempotency: if several chores land validated on the same Sunday, each
  // one's streak update would call this — only the first should post.
  const { data: existing } = await supabase
    .from("points_ledger")
    .select("id")
    .eq("child_id", childId)
    .eq("type", "weekly_streak_bonus")
    .eq("description", description)
    .maybeSingle();
  if (existing) return;

  const { data: weekAssignments } = await supabase
    .from("chore_assignments")
    .select("awarded_points, chore_instances!inner ( scheduled_date )")
    .eq("child_id", childId)
    .in("status", ["verified_complete", "verified_partially_complete"])
    .gte("chore_instances.scheduled_date", requiredWeekStart)
    .lte("chore_instances.scheduled_date", weekSunday);

  const weekTotalPoints = (weekAssignments ?? []).reduce(
    (sum, row) => sum + (row.awarded_points ?? 0),
    0
  );
  if (weekTotalPoints <= 0) return;

  // 10% of the week's earned points, rounded, minimum 1 if the week had any
  // points at all — posted as its own line, never altering the per-chore
  // points a parent set.
  const bonus = Math.max(1, Math.round(weekTotalPoints * 0.1));

  await supabase.from("points_ledger").insert({
    child_id: childId,
    delta: bonus,
    type: "weekly_streak_bonus",
    description,
  });
}
