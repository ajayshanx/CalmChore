import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("first_name, family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!parent) {
    redirect("/parent/finish-setup");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-calm-green">
        Welcome back, {parent.first_name}
      </h1>
      <p className="mt-2 text-calm-text/70">
        This is a placeholder dashboard — Chores, Chore Calendar, Child Progress, Validate
        Chores, Points Redemption, Chore Breaks, Setup, and About are built next.
      </p>
    </main>
  );
}
