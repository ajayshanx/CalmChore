import Link from "next/link";
import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { tierChipClass, getTierStatus } from "@/lib/tiers";

export default async function ChildDashboardPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();
  const { data: streak } = await supabase
    .from("child_streaks")
    .select("current_streak_days")
    .eq("child_id", session.childId)
    .maybeSingle();

  const tier = getTierStatus(streak?.current_streak_days ?? 0);

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 px-6 text-center">
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
        🛡️ {tier.tierName} · Level {tier.level}
      </Link>
      <p className="max-w-sm text-calm-text/70">Keep completing chores to grow your streak!</p>
    </main>
  );
}
