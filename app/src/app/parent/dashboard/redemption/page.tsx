import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFamilyTimezone } from "@/lib/families";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import type { RedemptionCategory } from "@/lib/redemption";
import {
  averagePointsPerDay,
  lastRedeemedByTier,
  getRedemptionGuidance,
  type RedemptionTier,
} from "@/lib/redemptionGuidance";
import RedemptionView, { type RedemptionRequestRow } from "./RedemptionView";

export default async function RedemptionPage() {
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
    .eq("family_id", parent.family_id);

  const childIds = (children ?? []).map((c) => c.id);
  const childLabelById = new Map(
    (children ?? []).map((c) => [c.id, c.nickname || c.username || "Child"])
  );

  const timezone = await getFamilyTimezone(supabase, parent.family_id);
  const today = todayStrInTimezone(timezone);

  const [{ data: requestRows }, { data: ledgerRows }] = await Promise.all([
    childIds.length
      ? supabase
          .from("redemption_requests")
          .select(
            "id, child_id, category, request_details, status, points_used, rejection_reason, created_at, decided_at"
          )
          .in("child_id", childIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    childIds.length
      ? supabase.from("points_ledger").select("child_id, delta, type, created_at").in("child_id", childIds)
      : Promise.resolve({ data: [] as { child_id: string; delta: number; type: string; created_at: string }[] }),
  ]);

  const pointsByChild = new Map<string, number>();
  const ledgerByChild = new Map<string, { delta: number; type: string; createdAt: string }[]>();
  for (const row of ledgerRows ?? []) {
    pointsByChild.set(row.child_id, (pointsByChild.get(row.child_id) ?? 0) + row.delta);
    const arr = ledgerByChild.get(row.child_id) ?? [];
    arr.push({ delta: row.delta, type: row.type, createdAt: row.created_at });
    ledgerByChild.set(row.child_id, arr);
  }

  const requestsByChild = new Map<
    string,
    { category: string; status: string; decidedAt: string | null; createdAt: string }[]
  >();
  for (const row of requestRows ?? []) {
    const arr = requestsByChild.get(row.child_id) ?? [];
    arr.push({ category: row.category, status: row.status, decidedAt: row.decided_at, createdAt: row.created_at });
    requestsByChild.set(row.child_id, arr);
  }

  // Redemption pacing guidance, computed per child (each child has their
  // own earning rate and redemption history) — see
  // lib/redemptionGuidance.ts for why this is relative rather than a fixed
  // point number.
  const avgPtsPerDayByChild = new Map<string, number>();
  const lastByTierByChild = new Map<string, Record<RedemptionTier, string | null>>();
  for (const childId of childIds) {
    avgPtsPerDayByChild.set(childId, averagePointsPerDay(ledgerByChild.get(childId) ?? [], today));
    lastByTierByChild.set(childId, lastRedeemedByTier(requestsByChild.get(childId) ?? []));
  }

  const requests: RedemptionRequestRow[] = (requestRows ?? []).map((row) => ({
    id: row.id,
    childId: row.child_id,
    childLabel: childLabelById.get(row.child_id) ?? "Child",
    childCurrentPoints: pointsByChild.get(row.child_id) ?? 0,
    category: row.category,
    details: row.request_details,
    status: row.status,
    pointsUsed: row.points_used,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    guidance: getRedemptionGuidance(
      row.category as RedemptionCategory,
      avgPtsPerDayByChild.get(row.child_id) ?? 0,
      lastByTierByChild.get(row.child_id) ?? { everyday: null, outing: null, big: null },
      today
    ),
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">Points Redemption</h1>
        <p className="mt-2 text-sm text-calm-text/70">
          Your child has been asked to discuss point redemptions with you and keep it regular and
          consistent. Depending on what they want to use their points for, you&apos;ll need to
          agree on and debit a number of points based on the purpose and the amount you spend.
        </p>
      </div>
      <RedemptionView requests={requests} />
    </main>
  );
}
