import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";
import MyChoresView, { type MyChoreRow } from "./MyChoresView";

export default async function MyChoresPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();
  const timezone = await getFamilyTimezone(supabase, session.familyId);
  const today = todayStrInTimezone(timezone);
  const { data: rows } = await supabase
    .from("chore_assignments")
    .select(
      `id, status, accepted_at, submitted_at, validated_at, awarded_points, incomplete_reason,
       chore_instances (
         id, scheduled_date, scheduled_time, deadline_at, points,
         chores ( id, name, info, requires_proof )
       )`
    )
    .eq("child_id", session.childId)
    .is("hidden_by_break_id", null) // hidden while a Chore Break covers that day
    .order("created_at", { ascending: false });

  const myChores: MyChoreRow[] = (rows ?? []).map((row) => {
    const instance = Array.isArray(row.chore_instances) ? row.chore_instances[0] : row.chore_instances;
    const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
    return {
      assignmentId: row.id,
      status: row.status,
      acceptedAt: row.accepted_at,
      submittedAt: row.submitted_at,
      validatedAt: row.validated_at,
      awardedPoints: row.awarded_points,
      incompleteReason: row.incomplete_reason,
      date: instance?.scheduled_date ?? "",
      time: instance?.scheduled_time ?? null,
      deadlineAt: instance?.deadline_at ?? null,
      points: instance?.points ?? 0,
      choreName: chore?.name ?? "Chore",
      choreInfo: chore?.info ?? null,
      requiresProof: chore?.requires_proof ?? false,
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">My Chores</h1>
      <MyChoresView chores={myChores} today={today} />
    </main>
  );
}
