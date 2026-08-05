import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChoresView from "./ChoresView";
import { getFamilyTimezone } from "@/lib/families";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { checkRecurringSchedulesLow } from "@/lib/chores/scheduleLowCheck";

export default async function ParentChoresPage() {
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

  const timezone = await getFamilyTimezone(supabase, parent.family_id);
  const today = todayStrInTimezone(timezone);

  // Lazy check (no cron in this app) — warns parents once a recurring
  // chore's generated schedule is down to its last few occurrences.
  await checkRecurringSchedulesLow(supabase, parent.family_id, today);

  const [{ data: chores }, { data: children }, { data: ideaRows }, { data: myLikes }] = await Promise.all([
    // Nested instances + assignments needed to power the Ongoing / All Chores
    // sub-tabs and the "current or next instance" info shown per chore (see
    // "Parent Login Options.txt" — Chores tab).
    supabase
      .from("chores")
      .select(
        "id, name, info, points, status, assignment_type, requires_proof, recurrence_type, chore_instances(id, scheduled_date, scheduled_time, deadline_at, points, chore_assignments(id, child_id, status, awarded_points))"
      )
      .eq("family_id", parent.family_id)
      .order("name", { ascending: true }),
    supabase
      .from("children")
      .select("id, nickname, username")
      .eq("family_id", parent.family_id)
      .order("created_at", { ascending: true }),
    // "Chore Ideas from other families" — the chores_ideas_select RLS policy
    // already restricts this to active chores with >=1 real instance
    // (someone actually used it), across any family; this .neq just keeps a
    // family's own chores out of their own Ideas list, since those already
    // show up under Active/Inactive.
    supabase
      .from("chores")
      .select("id, name, info, points, like_count")
      .neq("family_id", parent.family_id)
      .order("like_count", { ascending: false }),
    supabase.from("chore_likes").select("chore_id").eq("parent_id", user.id),
  ]);

  const childLabelMap = new Map(
    (children ?? []).map((c) => [c.id, c.nickname || c.username || "Unnamed child"])
  );

  const choreRows = (chores ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    info: c.info,
    points: c.points,
    status: c.status,
    assignment_type: c.assignment_type,
    requires_proof: c.requires_proof,
    recurrence_type: c.recurrence_type,
    instances: (c.chore_instances ?? []).map((inst) => ({
      id: inst.id,
      date: inst.scheduled_date as string,
      time: inst.scheduled_time,
      deadlineAt: inst.deadline_at,
      points: inst.points,
      assignments: (inst.chore_assignments ?? []).map((a) => ({
        childId: a.child_id,
        childLabel: childLabelMap.get(a.child_id) ?? "Unknown",
        status: a.status,
        awardedPoints: a.awarded_points,
      })),
    })),
  }));

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
  }));

  const likedChoreIds = new Set((myLikes ?? []).map((l) => l.chore_id));
  const choreIdeas = (ideaRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    info: r.info,
    points: r.points,
    likeCount: r.like_count,
    likedByMe: likedChoreIds.has(r.id),
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Chores</h1>
      <ChoresView chores={choreRows} familyChildren={familyChildren} choreIdeas={choreIdeas} today={today} />
    </main>
  );
}
