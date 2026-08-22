import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getFamilyTimezone } from "@/lib/families";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import ValidateView, { type ValidationRow, type FreezeRequestRow } from "./ValidateView";

export default async function ValidatePage() {
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

  // Needed to flag submissions for a day other than today — see the
  // scheduledDate handling below. This is exactly the distinction that
  // matters for streak/freeze correctness (see streakEngine.ts), but until
  // now the Validate screen gave parents no way to see it.
  const timezone = await getFamilyTimezone(supabase, parent.family_id);
  const today = todayStrInTimezone(timezone);

  const [{ data: rows }, { data: freezeRows }] = await Promise.all([
    supabase
      .from("chore_assignments")
      .select(
        `id, child_id, submitted_at, proof_photo_url,
         chore_instances ( id, scheduled_date, deadline_at, points, chores ( name ) ),
         children ( nickname, username )`
      )
      .eq("status", "unverified")
      .is("hidden_by_break_id", null)
      .order("submitted_at", { ascending: true }),
    supabase
      .from("chore_freezes")
      .select("id, freeze_from, freeze_to, reason, requested_at, children ( nickname, username )")
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
  ]);

  // Signed URLs need the service-role client (the bucket has no policies
  // for the authenticated role) — safe here because the rows above are
  // already scoped to this parent's family by RLS.
  const service = createServiceClient();
  const pending: ValidationRow[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const instance = Array.isArray(row.chore_instances) ? row.chore_instances[0] : row.chore_instances;
      const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
      const child = Array.isArray(row.children) ? row.children[0] : row.children;

      let photoUrl: string | null = null;
      if (row.proof_photo_url) {
        const { data: signed } = await service.storage
          .from("chore-proofs")
          .createSignedUrl(row.proof_photo_url, 300);
        photoUrl = signed?.signedUrl ?? null;
      }

      const scheduledDate = instance?.scheduled_date ?? null;
      // Precomputed once here (rather than threading `today` into both
      // ValidateView and ValidatePopup) — this is exactly the "which day is
      // this chore actually for" distinction that matters for streak/freeze
      // correctness (see streakEngine.ts), so it's worth surfacing directly
      // instead of leaving a parent to infer it from submission time alone.
      const dateFlag: "late" | "early" | null =
        !scheduledDate || scheduledDate === today ? null : scheduledDate < today ? "late" : "early";

      return {
        assignmentId: row.id,
        childId: row.child_id,
        choreInstanceId: instance?.id ?? null,
        choreName: chore?.name ?? "Chore",
        childLabel: child?.nickname || child?.username || "Child",
        submittedAt: row.submitted_at,
        scheduledDate,
        dateFlag,
        deadlineAt: instance?.deadline_at ?? null,
        points: instance?.points ?? 0,
        photoUrl,
      };
    })
  );

  const freezeRequests: FreezeRequestRow[] = (freezeRows ?? []).map((row) => {
    const child = Array.isArray(row.children) ? row.children[0] : row.children;
    return {
      freezeId: row.id,
      childLabel: child?.nickname || child?.username || "Child",
      freezeFrom: row.freeze_from,
      freezeTo: row.freeze_to,
      reason: row.reason,
      requestedAt: row.requested_at,
    };
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Validate Chores</h1>
      <ValidateView pending={pending} freezeRequests={freezeRequests} />
    </main>
  );
}
