import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";

export default async function ChildDashboardPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-calm-green">Hi, {session.nickname}!</h1>
      <p className="max-w-sm text-calm-text/70">
        Your chores, points, and streak are coming next — this just confirms your login works.
      </p>
    </main>
  );
}
