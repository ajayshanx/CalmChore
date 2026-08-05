import Link from "next/link";
import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { tierChipClass, getTierStatus } from "@/lib/tiers";
import TierShield from "@/components/icons/TierShield";
import { advanceStreakThrough } from "@/lib/points/streakEngine";
import { getFamilyTimezone } from "@/lib/families";
import { addDaysStr, todayStrInTimezone } from "@/lib/chores/calendarDates";
import FreezeBanner from "./FreezeBanner";

export default async function ChildDashboardPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();

  // There's no cron job in this app — catch up any unresolved past days
  // (auto-freezes, breaks, the Weekly Streak Bonus) right here so the
  // streak/tier shown below stays fresh even without a recent validation.
  const timezone = await getFamilyTimezone(supabase, session.familyId);
  const yesterday = addDaysStr(todayStrInTimezone(timezone), -1);
  await advanceStreakThrough(supabase, session.childId, yesterday);

  const [{ data: streak }, { data: unackedFreezeRows }] = await Promise.all([
    supabase
      .from("child_streaks")
      .select("current_streak_days")
      .eq("child_id", session.childId)
      .maybeSingle(),
    supabase
      .from("chore_freezes")
      .select("id, freeze_from, freeze_to")
      .eq("child_id", session.childId)
      .eq("status", "auto_applied")
      .is("acknowledged_at", null)
      .order("freeze_from", { ascending: true }),
  ]);

  const tier = getTierStatus(streak?.current_streak_days ?? 0);
  const unackedFreezes = (unackedFreezeRows ?? []).map((row) => ({
    id: row.id,
    freezeFrom: row.freeze_from,
    freezeTo: row.freeze_to,
  }));

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <FreezeBanner freezes={unackedFreezes} />
      <h1 className="text-2xl font-semibold text-calm-green">Hi, {session.nickname}!</h1>
      <div className="rounded-2xl border border-calm-green/20 bg-white px-8 py-5">
        <p className="text-3xl font-semibold text-calm-green">
          {tier.streakDays > 0 ? `🔥 ${tier.streakDays}` : "0"}
        </p>
        <p className="text-sm text-calm-text/60">
          day streak{tier.streakDays !== 1 ? "s" : ""}
        </p>
      </div>
      <Link
        href="/child/dashboard/points"
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tierChipClass(tier.tierName)}`}
      >
        <TierShield tierName={tier.tierName} level={tier.level} weapon={tier.weapon} size={18} />
        {tier.tierName} · Level {tier.level}
      </Link>
      <p className="max-w-sm text-calm-text/70">Keep completing chores to grow your streak!</p>
    </main>
  );
}
