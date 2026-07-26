import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddChildForm from "./AddChildForm";

const ACCENT_LABELS: Record<string, string> = {
  blue: "Blue",
  red: "Red",
  purple: "Purple",
  orange: "Orange",
  gold: "Gold",
  teal: "Teal",
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

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">
          Welcome back, {parent.first_name}
        </h1>
        <p className="mt-2 text-calm-text/70">
          Chores, Chore Calendar, Validate Chores, Points Redemption, Chore Breaks, and About
          are built next.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Children</h2>
        {children && children.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {children.map((child) => (
              <li
                key={child.id}
                className="rounded-lg border border-calm-green/20 bg-white px-4 py-3"
              >
                <span className="font-medium">{child.nickname}</span>{" "}
                <span className="text-sm text-calm-text/60">
                  (@{child.username} ·{" "}
                  {ACCENT_LABELS[child.accent_colour as string] ?? child.accent_colour})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/60">No children added yet.</p>
        )}
      </section>

      <AddChildForm />
    </main>
  );
}
