import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTierStatus } from "@/lib/tiers";
import ProgressView, { type ChildProgressRow, type FriendRequestRow } from "./ProgressView";

const ONGOING_STATUSES = ["unassigned", "assigned", "accepted", "unverified", "incomplete"];
const COMPLETED_STATUSES = ["verified_complete", "verified_partially_complete"];

export default async function ChildProgressPage() {
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

  const childIds = (children ?? []).map((c) => c.id);
  const childLabelById = new Map(
    (children ?? []).map((c) => [c.id, c.nickname || c.username || "Child"])
  );

  const [
    { data: assignmentRows },
    { data: ledgerRows },
    { data: streakRows },
    { data: approvedFriendships },
    { data: pendingFriendships },
  ] = await Promise.all([
    childIds.length
      ? supabase
          .from("chore_assignments")
          .select(
            "id, child_id, status, hidden_by_break_id, validated_at, chore_instances ( chores ( name ) )"
          )
          .in("child_id", childIds)
      : Promise.resolve({ data: [] as never[] }),
    childIds.length
      ? supabase.from("points_ledger").select("child_id, delta").in("child_id", childIds)
      : Promise.resolve({ data: [] as { child_id: string; delta: number }[] }),
    childIds.length
      ? supabase.from("child_streaks").select("child_id, current_streak_days").in("child_id", childIds)
      : Promise.resolve({ data: [] as { child_id: string; current_streak_days: number }[] }),
    childIds.length
      ? supabase
          .from("friendships")
          .select(
            "id, requester_child_id, addressee_child_id, requester:requester_child_id ( nickname, username ), addressee:addressee_child_id ( nickname, username )"
          )
          .eq("status", "approved")
          .or(`requester_child_id.in.(${childIds.join(",")}),addressee_child_id.in.(${childIds.join(",")})`)
      : Promise.resolve({ data: [] as never[] }),
    childIds.length
      ? supabase
          .from("friendships")
          .select("id, requester_child_id, addressee_child_id, requested_at, requester:requester_child_id ( nickname, username )")
          .eq("status", "pending")
          .in("addressee_child_id", childIds)
      : Promise.resolve({ data: [] as never[] }),
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
  const last10CompletedByChild = new Map<string, { id: string; name: string; validatedAt: string | null }[]>();
  const ongoingNamesByChild = new Map<string, string[]>();

  for (const row of assignmentRows ?? []) {
    const instance = Array.isArray(row.chore_instances) ? row.chore_instances[0] : row.chore_instances;
    const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
    const choreName = chore?.name ?? "Chore";

    if (COMPLETED_STATUSES.includes(row.status)) {
      completedByChild.set(row.child_id, (completedByChild.get(row.child_id) ?? 0) + 1);
      const list = last10CompletedByChild.get(row.child_id) ?? [];
      list.push({ id: row.id, name: choreName, validatedAt: row.validated_at });
      last10CompletedByChild.set(row.child_id, list);
    } else if (ONGOING_STATUSES.includes(row.status) && !row.hidden_by_break_id) {
      ongoingByChild.set(row.child_id, (ongoingByChild.get(row.child_id) ?? 0) + 1);
      const list = ongoingNamesByChild.get(row.child_id) ?? [];
      list.push(choreName);
      ongoingNamesByChild.set(row.child_id, list);
    }
  }
  for (const [childId, list] of last10CompletedByChild) {
    list.sort((a, b) => (b.validatedAt ?? "").localeCompare(a.validatedAt ?? ""));
    last10CompletedByChild.set(childId, list.slice(0, 10));
  }

  const friendsByChild = new Map<string, string[]>();
  for (const row of approvedFriendships ?? []) {
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
    const addressee = Array.isArray(row.addressee) ? row.addressee[0] : row.addressee;
    const requesterLabel = requester?.nickname || requester?.username || "Friend";
    const addresseeLabel = addressee?.nickname || addressee?.username || "Friend";

    if (childIds.includes(row.requester_child_id)) {
      const list = friendsByChild.get(row.requester_child_id) ?? [];
      list.push(addresseeLabel);
      friendsByChild.set(row.requester_child_id, list);
    }
    if (childIds.includes(row.addressee_child_id)) {
      const list = friendsByChild.get(row.addressee_child_id) ?? [];
      list.push(requesterLabel);
      friendsByChild.set(row.addressee_child_id, list);
    }
  }

  const friendRequests: FriendRequestRow[] = (pendingFriendships ?? []).map((row) => {
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
    return {
      id: row.id,
      forChildLabel: childLabelById.get(row.addressee_child_id) ?? "Child",
      requesterLabel: requester?.nickname || requester?.username || "Child",
      requestedAt: row.requested_at,
    };
  });

  const rows: ChildProgressRow[] = (children ?? []).map((child) => {
    const streak = streakByChild.get(child.id) ?? 0;
    const tier = getTierStatus(streak);
    return {
      id: child.id,
      label: child.nickname || child.username || "Unnamed child",
      colour: child.accent_colour ?? "neutral",
      totalCompleted: completedByChild.get(child.id) ?? 0,
      totalOngoing: ongoingByChild.get(child.id) ?? 0,
      totalPoints: pointsByChild.get(child.id) ?? 0,
      streak,
      tierName: tier.tierName,
      tierLevel: tier.level,
      friends: friendsByChild.get(child.id) ?? [],
      last10Completed: last10CompletedByChild.get(child.id) ?? [],
      ongoingChoreNames: ongoingNamesByChild.get(child.id) ?? [],
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Child Progress</h1>
      <ProgressView rows={rows} friendRequests={friendRequests} />
    </main>
  );
}
