import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "./CalendarView";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";
import { addDaysStr, todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";

// All calendar navigation (month/week/day, prev/next, child filter) happens
// client-side against one fetch, rather than round-tripping to the server
// per view change — this window is generous enough for normal browsing
// (about 2 months back, 3 months forward) without pulling a family's whole
// chore history.
const RANGE_START_OFFSET_DAYS = -62;
const RANGE_END_OFFSET_DAYS = 93;

export default async function ParentCalendarPage() {
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

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, username, accent_colour")
    .eq("family_id", parent.family_id)
    .order("created_at", { ascending: true });

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
    colour: c.accent_colour ?? "neutral",
  }));

  const timezone = await getFamilyTimezone(supabase, parent.family_id);
  const today = todayStrInTimezone(timezone);
  const rangeStart = addDaysStr(today, RANGE_START_OFFSET_DAYS);
  const rangeEnd = addDaysStr(today, RANGE_END_OFFSET_DAYS);

  const { data: rows } = await supabase
    .from("chore_instances")
    .select(
      `id, scheduled_date, scheduled_time, deadline_at, points,
       chores ( id, name, info, assignment_type ),
       chore_assignments ( id, child_id, status, children ( nickname, username, accent_colour ) )`
    )
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .order("scheduled_date", { ascending: true });

  const instances: CalendarInstance[] = (rows ?? []).map((row) => {
    const chore = Array.isArray(row.chores) ? row.chores[0] : row.chores;
    return {
      id: row.id,
      date: row.scheduled_date,
      time: row.scheduled_time,
      deadlineAt: row.deadline_at,
      points: row.points,
      choreId: chore?.id ?? "",
      choreName: chore?.name ?? "Chore",
      choreInfo: chore?.info ?? null,
      assignmentType: chore?.assignment_type ?? "single",
      assignments: (row.chore_assignments ?? []).map((a) => {
        const child = Array.isArray(a.children) ? a.children[0] : a.children;
        return {
          id: a.id,
          childId: a.child_id,
          childLabel: child?.nickname || child?.username || "Child",
          colour: child?.accent_colour ?? "neutral",
          status: a.status,
        };
      }),
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Chore Calendar</h1>
      <CalendarView instances={instances} familyChildren={familyChildren} initialToday={today} />
    </main>
  );
}
