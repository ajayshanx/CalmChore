import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysStr, mondayWeekStart } from "@/lib/chores/calendarDates";
import { getTierStatus, getWeeklyFreeFreezeCap } from "@/lib/tiers";
import { maybeAwardWeeklyStreakBonus } from "@/lib/points/weeklyBonus";

// How many of this week's free freezes (per getWeeklyFreeFreezeCap, keyed
// off the child's *current* tier) are still unused, as of `today`. Mirrors
// the exact rule the auto-freeze step below enforces — same week window
// (Mon-Sun), same statuses counted (auto_applied + approved; a pending
// request hasn't actually consumed a slot yet, matching the enforcement
// logic, not just the display). Used by both the child dashboard home page
// and the Points > Chore Freezes tab so kids can see this before they hit
// the cap rather than only finding out when a request gets declined.
export async function getFreezesRemainingThisWeek(
  supabase: SupabaseClient,
  childId: string,
  tierName: string,
  today: string
): Promise<{ remaining: number; cap: number }> {
  const cap = getWeeklyFreeFreezeCap(tierName);
  const weekMonday = mondayWeekStart(today);
  const weekSunday = addDaysStr(weekMonday, 6);

  const { count } = await supabase
    .from("chore_freezes")
    .select("id", { count: "exact", head: true })
    .eq("child_id", childId)
    .in("status", ["auto_applied", "approved"])
    .gte("freeze_from", weekMonday)
    .lte("freeze_from", weekSunday);

  return { remaining: Math.max(0, cap - (count ?? 0)), cap };
}

// Resolves each already-passed day for a child as one of:
//  - "break"   — covered by an active Chore Break for this child; protects
//                the streak independently of freezes, and (per spec) is not
//                eligible to also auto-consume a freeze
//  - "frozen"  — already covered by a parent-approved multi-day freeze
//  - "empty"   — no chores were due at all (not "required", per spec)
//  - "good"    — at least one chore validated Complete/Partially Complete
//  - "pending" — a chore was submitted and is still awaiting parent review
//                (the child isn't at fault for the delay — stop the walk
//                here rather than guessing at an outcome)
//  - "missed"  — chores were due and none were completed or pending review
type DayClassification = "break" | "frozen" | "empty" | "good" | "pending" | "missed";

async function classifyDay(
  supabase: SupabaseClient,
  childId: string,
  day: string
): Promise<DayClassification> {
  const { data: brk } = await supabase
    .from("chore_breaks")
    .select("id, chore_break_children!inner ( child_id )")
    .eq("status", "active")
    .eq("chore_break_children.child_id", childId)
    .lte("start_date", day)
    .gte("end_date", day)
    .maybeSingle();
  if (brk) return "break";

  const { data: freeze } = await supabase
    .from("chore_freezes")
    .select("id")
    .eq("child_id", childId)
    .eq("status", "approved")
    .lte("freeze_from", day)
    .gte("freeze_to", day)
    .maybeSingle();
  if (freeze) return "frozen";

  const { data: rows } = await supabase
    .from("chore_assignments")
    .select("status, chore_instances!inner ( scheduled_date )")
    .eq("child_id", childId)
    .eq("chore_instances.scheduled_date", day);

  if (!rows || rows.length === 0) return "empty";
  if (rows.some((r) => r.status === "verified_complete" || r.status === "verified_partially_complete")) {
    return "good";
  }
  if (rows.some((r) => r.status === "unverified")) return "pending";
  return "missed";
}

// Walks a child's streak forward, day by day, from the day after whatever
// was last resolved through `throughDay` (inclusive) — reconciling gaps with
// Chore Breaks (checked first, since they protect a day outright) and Chore
// Freezes (auto-applying one per day when the week's free-freeze cap for the
// child's current tier isn't yet used up) instead of always treating a gap
// as a broken streak.
//
// Note: if a break is cancelled *after* some of its days have already been
// walked (i.e. already resolved into last_counted_date), those days won't
// automatically re-open — there's no cron/replay job in this app, only
// forward walking from last_counted_date+1. In practice breaks are applied
// ahead of time, so this only matters for a retroactive cancel of a break
// covering already-elapsed days, an edge case not handled here.
//
// Call this both from the write path (validateChoreAssignment, with
// throughDay = the chore's scheduled_date) and from read paths that display
// streak/freeze state (with throughDay = yesterday in the family's
// timezone) so state stays reasonably fresh even without a recent
// validation — there's no cron job in this app, so nothing else advances it.
export async function advanceStreakThrough(
  supabase: SupabaseClient,
  childId: string,
  throughDay: string
): Promise<void> {
  const [{ data: streakRow }, { data: child }] = await Promise.all([
    supabase
      .from("child_streaks")
      .select("current_streak_days, last_counted_date, streak_started_date")
      .eq("child_id", childId)
      .maybeSingle(),
    supabase.from("children").select("created_at").eq("id", childId).maybeSingle(),
  ]);

  const createdDateStr = child?.created_at ? String(child.created_at).slice(0, 10) : throughDay;

  let currentStreakDays = streakRow?.current_streak_days ?? 0;
  let lastCountedDate = streakRow?.last_counted_date ?? null;
  let streakStartedDate = streakRow?.streak_started_date ?? null;

  let cursor = lastCountedDate ? addDaysStr(lastCountedDate, 1) : createdDateStr;
  if (cursor < createdDateStr) cursor = createdDateStr; // days before the child existed are never "required"

  let mutated = false;

  while (cursor <= throughDay) {
    const day = cursor;
    const classification = await classifyDay(supabase, childId, day);

    if (classification === "pending") {
      break; // this day's (and anything after it's) fate isn't known yet
    }

    if (classification === "empty") {
      lastCountedDate = day;
      mutated = true;
      cursor = addDaysStr(day, 1);
      continue;
    }

    if (classification === "good" || classification === "frozen" || classification === "break") {
      currentStreakDays += 1;
      if (!streakStartedDate) streakStartedDate = day;
      lastCountedDate = day;
      mutated = true;
    } else {
      // "missed" — try an automatic freeze before accepting a broken streak.
      const tierName = getTierStatus(currentStreakDays).tierName;
      const cap = getWeeklyFreeFreezeCap(tierName);
      const weekMonday = mondayWeekStart(day);
      const weekSunday = addDaysStr(weekMonday, 6);

      const { count } = await supabase
        .from("chore_freezes")
        .select("id", { count: "exact", head: true })
        .eq("child_id", childId)
        .in("status", ["auto_applied", "approved"])
        .gte("freeze_from", weekMonday)
        .lte("freeze_from", weekSunday);

      if ((count ?? 0) < cap) {
        await supabase.from("chore_freezes").insert({
          child_id: childId,
          freeze_from: day,
          freeze_to: day,
          reason: "No chores completed",
          status: "auto_applied",
        });
        currentStreakDays += 1;
        if (!streakStartedDate) streakStartedDate = day;
        lastCountedDate = day;
      } else {
        // Week's free freezes are used up — this day genuinely breaks the
        // streak. It's still "resolved" (won't be re-walked), just at zero.
        currentStreakDays = 0;
        streakStartedDate = null;
        lastCountedDate = day;
      }
      mutated = true;
    }

    // A Mon-Sun bonus week can only have just become complete the moment
    // its Sunday is resolved as anything other than a fresh break.
    if (new Date(`${day}T00:00:00Z`).getUTCDay() === 0 && streakStartedDate) {
      await maybeAwardWeeklyStreakBonus(supabase, childId, day, streakStartedDate);
    }

    cursor = addDaysStr(day, 1);
  }

  if (mutated) {
    await supabase.from("child_streaks").upsert({
      child_id: childId,
      current_streak_days: currentStreakDays,
      streak_started_date: streakStartedDate,
      last_counted_date: lastCountedDate,
    });
  }
}
