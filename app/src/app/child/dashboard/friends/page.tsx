import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { getTierStatus } from "@/lib/tiers";
import FriendsView, { type FriendRow, type PendingSentRow } from "./FriendsView";

const COMPLETED_STATUSES = ["verified_complete", "verified_partially_complete"];

export default async function FriendsPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();

  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, requester_child_id, addressee_child_id, status, requested_at")
    .or(`requester_child_id.eq.${session.childId},addressee_child_id.eq.${session.childId}`);

  const approved = (friendships ?? []).filter((f) => f.status === "approved");
  const pendingSent = (friendships ?? []).filter(
    (f) => f.status === "pending" && f.requester_child_id === session.childId
  );

  const friendChildIds = approved.map((f) =>
    f.requester_child_id === session.childId ? f.addressee_child_id : f.requester_child_id
  );
  const pendingAddresseeIds = pendingSent.map((f) => f.addressee_child_id);
  const allRelevantChildIds = Array.from(new Set([...friendChildIds, ...pendingAddresseeIds]));

  const [{ data: friendChildren }, { data: streakRows }, { data: assignmentRows }, { data: ledgerRows }] =
    await Promise.all([
      allRelevantChildIds.length
        ? supabase.from("children").select("id, nickname, username").in("id", allRelevantChildIds)
        : Promise.resolve({ data: [] as { id: string; nickname: string | null; username: string | null }[] }),
      friendChildIds.length
        ? supabase.from("child_streaks").select("child_id, current_streak_days").in("child_id", friendChildIds)
        : Promise.resolve({ data: [] as { child_id: string; current_streak_days: number }[] }),
      friendChildIds.length
        ? supabase
            .from("chore_assignments")
            .select(
              "id, child_id, status, awarded_points, validated_at, chore_instances ( scheduled_date, chores ( name ) )"
            )
            .in("child_id", friendChildIds)
        : Promise.resolve({ data: [] as never[] }),
      friendChildIds.length
        ? supabase.from("points_ledger").select("child_id, delta").in("child_id", friendChildIds)
        : Promise.resolve({ data: [] as { child_id: string; delta: number }[] }),
    ]);

  const nicknameById = new Map((friendChildren ?? []).map((c) => [c.id, c.nickname || c.username || "Friend"]));
  const streakById = new Map((streakRows ?? []).map((r) => [r.child_id, r.current_streak_days]));
  const pointsById = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    pointsById.set(row.child_id, (pointsById.get(row.child_id) ?? 0) + row.delta);
  }

  const completedById = new Map<string, number>();
  const last5ById = new Map<
    string,
    { id: string; name: string; date: string | null; points: number }[]
  >();
  for (const row of assignmentRows ?? []) {
    if (!COMPLETED_STATUSES.includes(row.status)) continue;
    completedById.set(row.child_id, (completedById.get(row.child_id) ?? 0) + 1);
    const instance = Array.isArray(row.chore_instances) ? row.chore_instances[0] : row.chore_instances;
    const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
    const list = last5ById.get(row.child_id) ?? [];
    list.push({
      id: row.id,
      name: chore?.name ?? "Chore",
      date: instance?.scheduled_date ?? row.validated_at,
      points: row.awarded_points ?? 0,
    });
    last5ById.set(row.child_id, list);
  }
  for (const [childId, list] of last5ById) {
    list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    last5ById.set(childId, list.slice(0, 5));
  }

  const friends: FriendRow[] = approved.map((f) => {
    const friendId = f.requester_child_id === session.childId ? f.addressee_child_id : f.requester_child_id;
    const streak = streakById.get(friendId) ?? 0;
    const tier = getTierStatus(streak);
    return {
      friendshipId: f.id,
      childId: friendId,
      nickname: nicknameById.get(friendId) ?? "Friend",
      streak,
      totalCompleted: completedById.get(friendId) ?? 0,
      totalPoints: pointsById.get(friendId) ?? 0,
      tierName: tier.tierName,
      tierLevel: tier.level,
      last5: last5ById.get(friendId) ?? [],
    };
  });

  const pendingRequests: PendingSentRow[] = pendingSent.map((f) => ({
    id: f.id,
    nickname: nicknameById.get(f.addressee_child_id) ?? "Child",
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">My Friends</h1>
      <FriendsView friends={friends} pendingRequests={pendingRequests} />
    </main>
  );
}
