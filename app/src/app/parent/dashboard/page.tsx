import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pillClass } from "@/lib/chores/calendarColours";
import { tierChipClass, getTierStatus } from "@/lib/tiers";

const ONGOING_STATUSES = ["assigned", "accepted", "unverified", "incomplete"];
const COMPLETED_STATUSES = ["verified_complete", "verified_partially_complete"];

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
};

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/parent");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("first_name, family_id, status")
    .eq("id", user.id)
    .maybeSingle();

  // No row yet, or an invited parent who hasn't set a password / accepted
  // T&C yet — either way, finish-setup is where that gets resolved.
  if (!parent || parent.status !== "active") {
    redirect("/parent/finish-setup");
  }

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, username, accent_colour")
    .eq("family_id", parent.family_id)
    .order("created_at", { ascending: true });

  const childIds = (children ?? []).map((c) => c.id);

  const [{ data: ledgerRows }, { data: assignmentStatusRows }, { data: ongoingRows }, { data: streakRows }] =
    await Promise.all([
      childIds.length
        ? supabase.from("points_ledger").select("child_id, delta").in("child_id", childIds)
        : Promise.resolve({ data: [] as { child_id: string; delta: number }[] }),
      childIds.length
        ? supabase
            .from("chore_assignments")
            .select("child_id, status")
            .in("child_id", childIds)
            .is("hidden_by_break_id", null)
        : Promise.resolve({ data: [] as { child_id: string; status: string }[] }),
      supabase
        .from("chore_assignments")
        .select(
          `id, status, chore_instances ( scheduled_date, chores ( name ) ), children ( nickname, username, accent_colour )`
        )
        .in("status", ONGOING_STATUSES)
        .is("hidden_by_break_id", null)
        .order("created_at", { ascending: false })
        .limit(10),
      childIds.length
        ? supabase.from("child_streaks").select("child_id, current_streak_days").in("child_id", childIds)
        : Promise.resolve({ data: [] as { child_id: string; current_streak_days: number }[] }),
    ]);

  const pointsByChild = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    pointsByChild.set(row.child_id, (pointsByChild.get(row.child_id) ?? 0) + row.delta);
  }

  const streakByChild = new Map<string, number>();
  for (const row of streakRows ?? []) {
    streakByChild.set(row.child_id, row.current_streak_days);
  }

  const completedByChild = new Map<string, number>();
  const ongoingByChild = new Map<string, number>();
  for (const row of assignmentStatusRows ?? []) {
    if (COMPLETED_STATUSES.includes(row.status)) {
      completedByChild.set(row.child_id, (completedByChild.get(row.child_id) ?? 0) + 1);
    } else if (ONGOING_STATUSES.includes(row.status)) {
      ongoingByChild.set(row.child_id, (ongoingByChild.get(row.child_id) ?? 0) + 1);
    }
  }

  const ongoingChores = (ongoingRows ?? []).map((row) => {
    const instance = Array.isArray(row.chore_instances) ? row.chore_instances[0] : row.chore_instances;
    const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
    const child = Array.isArray(row.children) ? row.children[0] : row.children;
    return {
      id: row.id,
      status: row.status,
      date: instance?.scheduled_date ?? "",
      choreName: chore?.name ?? "Chore",
      childLabel: child?.nickname || child?.username || "Child",
      colour: child?.accent_colour ?? "neutral",
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">
          Welcome back, {parent.first_name}
        </h1>
        <p className="mt-2 text-calm-text/70">
          Points Redemption, Child Progress detail, and About are built next.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Children</h2>
        {children && children.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const label = child.nickname || child.username || "Unnamed child";
              const tier = getTierStatus(streakByChild.get(child.id) ?? 0);
              return (
                <div
                  key={child.id}
                  className="rounded-lg border border-calm-green/20 bg-white px-4 py-3"
                >
                  <span
                    className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass(
                      child.accent_colour
                    )}`}
                  >
                    {label}
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-calm-green">
                        {pointsByChild.get(child.id) ?? 0}
                      </p>
                      <p className="text-xs text-calm-text/50">Points</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-calm-green">
                        {completedByChild.get(child.id) ?? 0}
                      </p>
                      <p className="text-xs text-calm-text/50">Completed</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-calm-green">
                        {ongoingByChild.get(child.id) ?? 0}
                      </p>
                      <p className="text-xs text-calm-text/50">Ongoing</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-calm-green">
                        {streakByChild.get(child.id) ?? 0}
                      </p>
                      <p className="text-xs text-calm-text/50">Streak</p>
                    </div>
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tierChipClass(
                      tier.tierName
                    )}`}
                  >
                    🛡️ {tier.tierName} · Level {tier.level}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-calm-text/60">
            No children added yet — head to{" "}
            <Link href="/parent/dashboard/setup" className="underline text-calm-green">
              Setup
            </Link>{" "}
            to add one.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-calm-green">Chores Currently Ongoing</h2>
          <Link href="/parent/dashboard/calendar" className="text-sm text-calm-green underline">
            View Calendar
          </Link>
        </div>
        {ongoingChores.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {ongoingChores.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-calm-green/20 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium">{c.choreName}</p>
                  <p className="text-sm text-calm-text/60">
                    {c.childLabel}
                    {c.date ? ` · ${c.date}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass(c.colour)}`}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/60">Nothing ongoing right now.</p>
        )}
      </section>
    </main>
  );
}
