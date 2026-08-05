import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTierStatus } from "@/lib/tiers";
import { advanceStreakThrough } from "@/lib/points/streakEngine";
import { getFamilyTimezone } from "@/lib/families";
import { addDaysStr, todayStrInTimezone } from "@/lib/chores/calendarDates";
import ManageView, { type ManagedChild, type ManageChoreRow, type ManageChildData } from "./ManageView";

const RANGE_START_OFFSET_DAYS = -62;
const RANGE_END_OFFSET_DAYS = 93;

export default async function ManagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/parent");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent || parent.status !== "active") {
    redirect("/parent/finish-setup");
  }

  const { data: managedRows } = await supabase
    .from("children")
    .select("id, nickname, username, accent_colour")
    .eq("family_id", parent.family_id)
    .eq("is_parent_managed", true)
    .order("created_at", { ascending: true });

  const managedChildren: ManagedChild[] = (managedRows ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Child",
    colour: c.accent_colour ?? "neutral",
  }));

  if (managedChildren.length === 0) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
        <h1 className="text-2xl font-semibold text-calm-green">Manage</h1>
        <p className="text-sm text-calm-text/60">
          No Parent-Managed children on this account yet. Add one from Setup → Profiles with the
          &quot;Parent-Managed&quot; option checked.
        </p>
      </main>
    );
  }

  const timezone = await getFamilyTimezone(supabase, parent.family_id);
  const today = todayStrInTimezone(timezone);
  const rangeStart = addDaysStr(today, RANGE_START_OFFSET_DAYS);
  const rangeEnd = addDaysStr(today, RANGE_END_OFFSET_DAYS);

  const { data: instanceRows } = await supabase
    .from("chore_instances")
    .select(
      `id, scheduled_date, scheduled_time, deadline_at, points,
       chores!inner ( id, name, info, assignment_type, requires_proof, family_id ),
       chore_assignments ( id, child_id, status, hidden_by_break_id )`
    )
    .eq("chores.family_id", parent.family_id)
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .order("scheduled_date", { ascending: true });

  const managedIds = new Set(managedChildren.map((c) => c.id));
  const choresByChild = new Map<string, ManageChoreRow[]>();
  for (const id of managedIds) choresByChild.set(id, []);

  for (const row of instanceRows ?? []) {
    const chore = Array.isArray(row.chores) ? row.chores[0] : row.chores;
    if (!chore) continue;
    const assignments = (row.chore_assignments ?? []).filter((a) => !a.hidden_by_break_id);

    for (const childId of managedIds) {
      const mine = assignments.find((a) => a.child_id === childId);
      const isOpenForMe =
        !mine &&
        (chore.assignment_type === "multi" ||
          assignments.length === 0);

      if (!mine && !isOpenForMe) continue;

      choresByChild.get(childId)!.push({
        instanceId: row.id,
        assignmentId: mine?.id ?? null,
        choreId: chore.id,
        choreName: chore.name,
        choreInfo: chore.info,
        date: row.scheduled_date,
        time: row.scheduled_time,
        deadlineAt: row.deadline_at,
        points: row.points,
        status: mine?.status ?? null,
        requiresProof: chore.requires_proof,
        assignmentType: chore.assignment_type,
      });
    }
  }

  const childData: Record<string, ManageChildData> = {};
  await Promise.all(
    managedChildren.map(async (child) => {
      const yesterday = addDaysStr(today, -1);
      await advanceStreakThrough(supabase, child.id, yesterday);

      const [{ data: streak }, { data: ledgerRows }, { data: freezeRows }] = await Promise.all([
        supabase
          .from("child_streaks")
          .select("current_streak_days")
          .eq("child_id", child.id)
          .maybeSingle(),
        supabase
          .from("points_ledger")
          .select("id, delta, type, description, created_at")
          .eq("child_id", child.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("chore_freezes")
          .select("id, freeze_from, freeze_to, reason, status")
          .eq("child_id", child.id)
          .order("freeze_from", { ascending: false }),
      ]);

      const totalPoints = (ledgerRows ?? []).reduce((sum, row) => sum + row.delta, 0);
      const tier = getTierStatus(streak?.current_streak_days ?? 0);

      childData[child.id] = {
        totalPoints,
        tier,
        ledger: (ledgerRows ?? []).map((row) => ({
          id: row.id,
          delta: row.delta,
          type: row.type,
          description: row.description,
          createdAt: row.created_at,
        })),
        freezes: (freezeRows ?? []).map((row) => ({
          id: row.id,
          freezeFrom: row.freeze_from,
          freezeTo: row.freeze_to,
          reason: row.reason,
          status: row.status,
        })),
      };
    })
  );

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Manage</h1>
      <ManageView
        managedChildren={managedChildren}
        choresByChild={Object.fromEntries(choresByChild)}
        childData={childData}
        today={today}
      />
    </main>
  );
}
