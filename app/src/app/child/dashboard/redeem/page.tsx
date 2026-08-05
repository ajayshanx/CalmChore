import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { getFamilyTimezone } from "@/lib/families";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { REDEMPTION_CATEGORIES, type RedemptionCategory } from "@/lib/redemption";
import {
  averagePointsPerDay,
  lastRedeemedByTier,
  getRedemptionGuidance,
  type RedemptionGuidance,
} from "@/lib/redemptionGuidance";
import RedeemView, { type RedemptionRow } from "./RedeemView";

export default async function RedeemPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();
  const timezone = await getFamilyTimezone(supabase, session.familyId);
  const today = todayStrInTimezone(timezone);

  const [{ data: ledgerRows }, { data: requestRows }] = await Promise.all([
    supabase.from("points_ledger").select("delta, type, created_at").eq("child_id", session.childId),
    supabase
      .from("redemption_requests")
      .select("id, category, request_details, status, points_used, rejection_reason, created_at, decided_at")
      .eq("child_id", session.childId)
      .order("created_at", { ascending: false }),
  ]);

  const totalPoints = (ledgerRows ?? []).reduce((sum, row) => sum + row.delta, 0);

  // Redemption pacing guidance — see lib/redemptionGuidance.ts for why this
  // is relative to the child's own recent earning rate rather than a fixed
  // point number.
  const avgPtsPerDay = averagePointsPerDay(
    (ledgerRows ?? []).map((r) => ({ delta: r.delta, type: r.type, createdAt: r.created_at })),
    today
  );
  const lastByTier = lastRedeemedByTier(
    (requestRows ?? []).map((r) => ({
      category: r.category,
      status: r.status,
      decidedAt: r.decided_at,
      createdAt: r.created_at,
    }))
  );
  const guidanceByCategory = Object.fromEntries(
    REDEMPTION_CATEGORIES.map((c) => [c, getRedemptionGuidance(c, avgPtsPerDay, lastByTier, today)])
  ) as Record<RedemptionCategory, RedemptionGuidance>;

  const requests: RedemptionRow[] = (requestRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    details: row.request_details,
    status: row.status,
    pointsUsed: row.points_used,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">Redeem Points</h1>
        <p className="mt-2 text-sm text-calm-text/70">
          Points earned from doing chores may be redeemed for treats during shopping, purchases,
          or simply screen time. Discuss this with your parents and ensure that points are
          redeemed regularly and with consistency — points are only fun when you use them.
          Depending on what you want to use your points for, your parent will reduce your points
          total, with a number of your points being used up by shopping, treats, or screen time.
        </p>
      </div>
      <RedeemView totalPoints={totalPoints} requests={requests} guidanceByCategory={guidanceByCategory} />
    </main>
  );
}
