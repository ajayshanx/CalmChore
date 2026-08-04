import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackView, { type FeedbackRow } from "./FeedbackView";

export default async function ParentFeedbackPage() {
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

  const { data: rows } = await supabase
    .from("feedback")
    .select(
      `id, message, submitted_by_type, created_at,
       parent:submitted_by_parent_id ( first_name, last_name ),
       child:submitted_by_child_id ( nickname, username )`
    )
    .eq("family_id", parent.family_id)
    .order("created_at", { ascending: false });

  const feedback: FeedbackRow[] = (rows ?? []).map((row) => {
    const p = Array.isArray(row.parent) ? row.parent[0] : row.parent;
    const c = Array.isArray(row.child) ? row.child[0] : row.child;
    const submitterLabel =
      row.submitted_by_type === "child"
        ? c?.nickname || c?.username || "A child"
        : p
          ? `${p.first_name} ${p.last_name}`
          : "A parent";
    return {
      id: row.id,
      message: row.message,
      submittedByType: row.submitted_by_type,
      submitterLabel,
      createdAt: row.created_at,
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-calm-green">Feedback</h1>
        <p className="mt-2 text-sm text-calm-text/70">
          Bugs and feature ideas from you and your kids, all in one place.
        </p>
      </div>
      <FeedbackView feedback={feedback} />
    </main>
  );
}
