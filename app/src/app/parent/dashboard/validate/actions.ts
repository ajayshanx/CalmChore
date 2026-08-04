"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { advanceStreakThrough } from "@/lib/points/streakEngine";
import { notifyChild } from "@/lib/notifications";

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
      "id, status, child_id, proof_photo_url, chore_instances ( scheduled_date, points, chores ( name, family_id ) )"
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

  if (chore?.family_id) {
    const outcomeText =
      outcome === "verified_complete"
        ? "marked complete"
        : outcome === "verified_partially_complete"
          ? "marked partially complete"
          : "marked incomplete";
    await notifyChild(supabase, {
      familyId: chore.family_id,
      childId: assignment.child_id,
      action: "chore_assessment",
      message: `Your chore was ${outcomeText}: ${chore.name ?? "Chore"}.`,
      link: "/child/dashboard/my-chores",
    });

    if (awardedPoints !== null && awardedPoints > 0) {
      await notifyChild(supabase, {
        familyId: chore.family_id,
        childId: assignment.child_id,
        action: "point_awarding",
        message: `You earned ${awardedPoints} point${awardedPoints === 1 ? "" : "s"} for ${chore.name ?? "Chore"}.`,
        link: "/child/dashboard/points",
      });
    }
  }

  // A validated Complete or Partially Complete counts as "did a chore" for
  // that instance's scheduled day, driving the child's streak. The engine
  // also reconciles any earlier unresolved gap days along the way — via an
  // automatic Chore Freeze where the week's free-freeze cap allows it, or a
  // genuine break where it doesn't — and posts the Weekly Streak Bonus for
  // any Mon-Sun week that turns out complete as a result.
  if (outcome === "verified_complete" || outcome === "verified_partially_complete") {
    const day = instance?.scheduled_date;
    if (day) {
      await advanceStreakThrough(supabase, assignment.child_id, day);
    }
  }

  revalidatePath("/parent/dashboard/validate");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/dashboard");
  return { success: true };
}

type FreezeDecision = "approved" | "declined";

export async function decideFreezeRequest(_prevState: unknown, formData: FormData) {
  const freezeId = String(formData.get("freezeId") || "");
  const decision = String(formData.get("decision") || "") as FreezeDecision;
  const declineReason = String(formData.get("declineReason") || "").trim();

  if (!freezeId) {
    return { error: "Missing request." };
  }
  if (!["approved", "declined"].includes(decision)) {
    return { error: "Invalid decision." };
  }
  if (decision === "declined" && !declineReason) {
    return { error: "Please enter a reason for declining." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS (chore_freezes_family) already scopes this to the parent's own
  // family via the child_id join — this select doubles as the authorization
  // check, same pattern as validateChoreAssignment above.
  const { data: freeze } = await supabase
    .from("chore_freezes")
    .select("id, status")
    .eq("id", freezeId)
    .maybeSingle();

  if (!freeze) {
    return { error: "Freeze request not found." };
  }
  if (freeze.status !== "pending") {
    return { error: "This request has already been decided." };
  }

  const { error } = await supabase
    .from("chore_freezes")
    .update({
      status: decision,
      reason: decision === "declined" ? declineReason : undefined,
      decided_by_parent_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", freezeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/validate");
  revalidatePath("/child/dashboard/points");
  return { success: true };
}
