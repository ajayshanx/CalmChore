import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import FeedbackView, { type FeedbackRow } from "./FeedbackView";

export default async function ChildFeedbackPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("feedback")
    .select(
      `id, message, submitted_by_type, created_at,
       parent:submitted_by_parent_id ( first_name, last_name ),
       child:submitted_by_child_id ( nickname, username )`
    )
    .eq("family_id", session.familyId)
    .order("created_at", { ascending: false });

  const feedback: FeedbackRow[] = (rows ?? []).map((row) => {
    const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;
    const child = Array.isArray(row.child) ? row.child[0] : row.child;
    const submitterLabel =
      row.submitted_by_type === "child"
        ? child?.nickname || child?.username || "A child"
        : parent
          ? `${parent.first_name} ${parent.last_name}`
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
          Tell us about a bug you found or a feature you&apos;d like — your parents can see this
          too.
        </p>
      </div>
      <FeedbackView feedback={feedback} />
    </main>
  );
}
