import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChoresView from "./ChoresView";

export default async function ParentChoresPage() {
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

  const [{ data: chores }, { data: children }] = await Promise.all([
    supabase
      .from("chores")
      .select("id, name, info, points, status, assignment_type, requires_proof")
      .eq("family_id", parent.family_id)
      .order("name", { ascending: true }),
    supabase
      .from("children")
      .select("id, nickname, username")
      .eq("family_id", parent.family_id)
      .order("created_at", { ascending: true }),
  ]);

  const familyChildren = (children ?? []).map((c) => ({
    id: c.id,
    label: c.nickname || c.username || "Unnamed child",
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Chores</h1>
      <ChoresView chores={chores ?? []} familyChildren={familyChildren} />
    </main>
  );
}
