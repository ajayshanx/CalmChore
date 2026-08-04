import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";

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

  const streakDays = streak?.current_streak_days ?? 0;

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-calm-green">Hi, {session.nickname}!</h1>
      <div className="rounded-2xl border border-calm-green/20 bg-white px-8 py-5">
        <p className="text-3xl font-semibold text-calm-green">
          {streakDays > 0 ? `🔥 ${streakDays}` : "0"}
        </p>
        <p className="text-sm text-calm-text/60">
          day streak{streakDays !== 1 ? "s" : ""}
        </p>
      </div>
      <p className="max-w-sm text-calm-text/70">
        Your points and tier are coming next — keep completing chores to grow your streak!
      </p>
    </main>
  );
}
