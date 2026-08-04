import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { getTierStatus } from "@/lib/tiers";
import { advanceStreakThrough } from "@/lib/points/streakEngine";
import { getFamilyTimezone } from "@/lib/families";
import { addDaysStr, todayStrInTimezone } from "@/lib/chores/calendarDates";
import PointsView, { type LedgerRow, type FreezeRow } from "./PointsView";

const ONGOING_STATUSES = ["unassigned", "assigned", "accepted", "unverified", "incomplete"];
const COMPLETED_STATUSES = ["verified_complete", "verified_partially_complete"];

export default async function PointsPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();

  // Same no-cron catch-up as the Home page — keeps streak/freeze/bonus state
  // current even if nothing's been validated recently.
  const timezone = await getFamilyTimezone(supabase, session.familyId);
  const yesterday = addDaysStr(todayStrInTimezone(timezone), -1);
  await advanceStreakThrough(supabase, session.childId, yesterday);

  const [{ data: streak }, { data: ledgerRows }, { data: assignmentRows }, { data: freezeRows }] =
    await Promise.all([
      supabase
        .from("child_streaks")
        .select("current_streak_days")
        .eq("child_id", session.childId)
        .maybeSingle(),
      supabase
        .from("points_ledger")
        .select("id, delta, type, description, created_at")
        .eq("child_id", session.childId)
        .order("created_at", { ascending: false }),
      supabase.from("chore_assignments").select("status").eq("child_id", session.childId),
      supabase
        .from("chore_freezes")
        .select("id, freeze_from, freeze_to, reason, status")
        .eq("child_id", session.childId)
        .order("freeze_from", { ascending: false }),
    ]);

  const totalPoints = (ledgerRows ?? []).reduce((sum, row) => sum + row.delta, 0);
  const totalCompleted = (assignmentRows ?? []).filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
  const totalOngoing = (assignmentRows ?? []).filter((r) => ONGOING_STATUSES.includes(r.status)).length;

  const tier = getTierStatus(streak?.current_streak_days ?? 0);

  const ledger: LedgerRow[] = (ledgerRows ?? []).map((row) => ({
    id: row.id,
    delta: row.delta,
    type: row.type,
    description: row.description,
    createdAt: row.created_at,
  }));

  const freezes: FreezeRow[] = (freezeRows ?? []).map((row) => ({
    id: row.id,
    freezeFrom: row.freeze_from,
    freezeTo: row.freeze_to,
    reason: row.reason,
    status: row.status,
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Points</h1>
      <PointsView
        totalCompleted={totalCompleted}
        totalOngoing={totalOngoing}
        totalPoints={totalPoints}
        tier={tier}
        ledger={ledger}
        freezes={freezes}
      />
    </main>
  );
}
