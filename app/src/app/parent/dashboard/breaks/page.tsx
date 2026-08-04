import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BreaksView, { type BreakRow } from "./BreaksView";

export default async function BreaksPage() {
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

  const [{ data: children }, { data: breakRows }] = await Promise.all([
    supabase
      .from("children")
      .select("id, nickname, username, accent_colour")
      .eq("family_id", parent.family_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("chore_breaks")
      .select(
        `id, start_date, end_date, status, created_at,
         chore_break_children ( children ( nickname, username, accent_colour ) )`
      )
      .order("start_date", { ascending: false }),
  ]);

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
    colour: c.accent_colour ?? "neutral",
  }));

  const breaks: BreakRow[] = (breakRows ?? []).map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    childLabels: (row.chore_break_children ?? []).map((c) => {
      const child = Array.isArray(c.children) ? c.children[0] : c.children;
      return child?.nickname || child?.username || "Child";
    }),
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">Chore Breaks</h1>
        <p className="mt-1 text-sm text-calm-text/60">
          For vacations or other stretches where chores should pause. The affected children&apos;s
          streaks are protected for the duration, and any chores already scheduled in that window
          are hidden until the break ends or is cancelled.
        </p>
      </div>
      <BreaksView familyChildren={familyChildren} breaks={breaks} />
    </main>
  );
}
