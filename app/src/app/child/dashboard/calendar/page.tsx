import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import CalendarView from "./CalendarView";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";
import { addDaysStr, todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";

// Same fixed-window approach as the parent calendar: one fetch covers all
// month/week/day navigation client-side, no per-view round trip.
const RANGE_START_OFFSET_DAYS = -62;
const RANGE_END_OFFSET_DAYS = 93;

export default async function ChildCalendarPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, username, accent_colour")
    .eq("family_id", session.familyId)
    .order("created_at", { ascending: true });

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
    colour: c.accent_colour ?? "neutral",
  }));

  const timezone = await getFamilyTimezone(supabase, session.familyId);
  const today = todayStrInTimezone(timezone);
  const rangeStart = addDaysStr(today, RANGE_START_OFFSET_DAYS);
  const rangeEnd = addDaysStr(today, RANGE_END_OFFSET_DAYS);

  // Mark the calendar as viewed so the "new chores" badge in the nav clears.
  await supabase
    .from("children")
    .update({ last_calendar_view_at: new Date().toISOString() })
    .eq("id", session.childId);

  const [{ data: rows }, { data: breakRows }] = await Promise.all([
    supabase
      .from("chore_instances")
      .select(
        `id, scheduled_date, scheduled_time, deadline_at, points,
         chores!inner ( id, name, info, assignment_type, family_id ),
         chore_assignments ( id, child_id, status, hidden_by_break_id, children ( nickname, username, accent_colour ) )`
      )
      .eq("chores.family_id", session.familyId)
      .gte("scheduled_date", rangeStart)
      .lte("scheduled_date", rangeEnd)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("chore_breaks")
      .select("start_date, end_date, chore_break_children!inner ( child_id )")
      .eq("status", "active")
      .eq("chore_break_children.child_id", session.childId)
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart),
  ]);

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
      assignments: (row.chore_assignments ?? [])
        .filter((a) => !a.hidden_by_break_id)
        .map((a) => {
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

  // Own Chore Break days, expanded into individual date strings, so the
  // calendar can show a "Chore Break" marker instead of the (now-hidden)
  // chore pills for those days.
  const breakDates: string[] = [];
  for (const row of breakRows ?? []) {
    let cursor = row.start_date;
    while (cursor <= row.end_date) {
      breakDates.push(cursor);
      cursor = addDaysStr(cursor, 1);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Chore Calendar</h1>
      <CalendarView
        instances={instances}
        familyChildren={familyChildren}
        currentChildId={session.childId}
        initialToday={today}
        breakDates={breakDates}
      />
    </main>
  );
}
