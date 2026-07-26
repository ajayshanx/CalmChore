"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Outcome = "verified_complete" | "verified_partially_complete" | "incomplete";

export async function validateChoreAssignment(_prevState: unknown, formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  const outcome = String(formData.get("outcome") || "") as Outcome;
  const awardedPointsRaw = formData.get("awardedPoints");
  const incompleteReason = String(formData.get("incompleteReason") || "").trim();

  if (!assignmentId) {
    return { error: "Missing chore." };
  }
  if (!["verified_complete", "verified_partially_complete", "incomplete"].includes(outcome)) {
    return { error: "Invalid outcome." };
  }
  if (outcome === "verified_partially_complete" && !awardedPointsRaw) {
    return { error: "Enter how many points to award." };
  }
  if (outcome === "incomplete" && !incompleteReason) {
    return { error: "Please enter a reason for non-completion." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS (chore_assignments_family) already scopes this to the parent's own
  // family — this select doubles as the authorization check.
  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select(
      "id, status, child_id, proof_photo_url, chore_instances ( points, chores ( name ) )"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return { error: "Chore not found." };
  }
  if (assignment.status !== "unverified") {
    return { error: "This chore isn't awaiting validation." };
  }

  const instance = Array.isArray(assignment.chore_instances)
    ? assignment.chore_instances[0]
    : assignment.chore_instances;
  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
  const fullPoints = instance?.points ?? 0;

  let awardedPoints: number | null = null;
  if (outcome === "verified_complete") {
    awardedPoints = fullPoints;
  } else if (outcome === "verified_partially_complete") {
    awardedPoints = Number(awardedPointsRaw);
    if (!Number.isFinite(awardedPoints) || awardedPoints < 0 || awardedPoints > fullPoints) {
      return { error: `Awarded points must be between 0 and ${fullPoints}.` };
    }
  }

  const { error: updateError } = await supabase
    .from("chore_assignments")
    .update({
      status: outcome,
      awarded_points: awardedPoints,
      incomplete_reason: outcome === "incomplete" ? incompleteReason : null,
      validated_at: new Date().toISOString(),
      validated_by_parent_id: user.id,
      proof_photo_url: null,
    })
    .eq("id", assignmentId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Proof photos are deleted the moment an outcome is set, regardless of
  // outcome — see "Calm Chore Creation.txt" data-minimization rule. Storage
  // deletion needs the service-role client since the bucket has no policies
  // for the authenticated role.
  if (assignment.proof_photo_url) {
    const service = createServiceClient();
    await service.storage.from("chore-proofs").remove([assignment.proof_photo_url]);
  }

  if (awardedPoints !== null && awardedPoints > 0) {
    await supabase.from("points_ledger").insert({
      child_id: assignment.child_id,
      delta: awardedPoints,
      type: "chore_award",
      reference_id: assignmentId,
      description: chore?.name ?? "Chore",
    });
  }

  revalidatePath("/parent/dashboard/validate");
  return { success: true };
}
