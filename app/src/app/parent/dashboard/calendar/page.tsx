import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "./CalendarView";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";

export default async function ParentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getUTCFullYear();
  const month = params.m ? Number(params.m) - 1 : now.getUTCMonth(); // 0-indexed

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
    .select("id, nickname, username")
    .eq("family_id", parent.family_id)
    .order("created_at", { ascending: true });

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
  }));

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(monthEndDate).padStart(2, "0")}`;

  const { data: rows } = await supabase
    .from("chore_instances")
    .select(
      `id, scheduled_date, scheduled_time, deadline_at, points,
       chores ( id, name, info, assignment_type ),
       chore_assignments ( id, child_id, status, children ( nickname, username, accent_colour ) )`
    )
    .gte("scheduled_date", monthStart)
    .lte("scheduled_date", monthEnd)
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
      <CalendarView year={year} month={month} instances={instances} familyChildren={familyChildren} />
    </main>
  );
}
