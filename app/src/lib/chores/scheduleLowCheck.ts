import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyAllParents } from "@/lib/notifications";

const LOW_SCHEDULE_THRESHOLD = 5;

// "For recurring chore end date, send a push notification to the parents'
// notifications list that the recurring one ends after another 5
// recurrences." A recurring chore's generated instances (see
// lib/chores/schedule.ts — bounded by the parent's own end date/count, or
// the generation safety cap) only run low as calendar days pass, not in
// response to any single write, so this is checked lazily whenever the
// parent's Chores tab loads rather than on a cron (this app has none — see
// streakEngine.ts for the same lazy-reconciliation pattern used for
// freezes). `low_schedule_notified` makes the warning fire once per
// "running low" episode; addChoreInstance resets it after the parent
// extends the schedule, so it can fire again next time it runs low.
export async function checkRecurringSchedulesLow(
  supabase: SupabaseClient,
  familyId: string,
  today: string
): Promise<void> {
  const { data: candidates } = await supabase
    .from("chores")
    .select("id, name")
    .eq("family_id", familyId)
    .eq("status", "active")
    .neq("recurrence_type", "none")
    .eq("low_schedule_notified", false);

  for (const chore of candidates ?? []) {
    const { count } = await supabase
      .from("chore_instances")
      .select("id", { count: "exact", head: true })
      .eq("chore_id", chore.id)
      .gte("scheduled_date", today);

    if (count === null || count > LOW_SCHEDULE_THRESHOLD) continue;

    await notifyAllParents(supabase, {
      familyId,
      action: "chore_schedule_low",
      message: `"${chore.name}" is a recurring chore ending after ${count} more occurrence${
        count === 1 ? "" : "s"
      } — extend it from the Chores tab to keep it going.`,
      link: "/parent/dashboard/chores",
    });
    await supabase.from("chores").update({ low_schedule_notified: true }).eq("id", chore.id);
  }
}
