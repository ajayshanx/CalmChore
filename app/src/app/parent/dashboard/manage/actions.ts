"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { advanceStreakThrough } from "@/lib/points/streakEngine";

function revalidateAffectedPaths() {
  revalidatePath("/parent/dashboard/manage");
  revalidatePath("/parent/dashboard/calendar");
  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/progress");
  revalidatePath("/parent/dashboard");
}

type Outcome = "verified_complete" | "verified_partially_complete" | "incomplete";

// Collapses accept -> perform -> submit -> validate into one parent gesture,
// per "Parent Login Options.txt" -> "Manage for [Child]": "There is no
// separate validation step, since the same parent would otherwise be both
// submitting and validating - points are credited and the streak updates
// immediately." A live photo is required up front (if the chore needs one)
// but is never stored — there's no later review step for it to support.
export async function markChoreDone(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  const assignmentId = String(formData.get("assignmentId") || "") || null;
  const childId = String(formData.get("childId") || "");
  const outcome = String(formData.get("outcome") || "") as Outcome;
  const awardedPointsRaw = formData.get("awardedPoints");
  const incompleteReason = String(formData.get("incompleteReason") || "").trim();
  const requiresProof = formData.get("requiresProof") === "true";
  const photo = formData.get("photo") as File | null;

  if (!instanceId || !childId) {
    return { error: "Missing chore or child." };
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
  if (requiresProof && (!photo || photo.size === 0)) {
    return { error: "This chore requires a photo before you can mark it done." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { error: "Could not find your family." };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, is_parent_managed")
    .eq("id", childId)
    .eq("family_id", parent.family_id)
    .maybeSingle();
  if (!child || !child.is_parent_managed) {
    return { error: "This isn't a Parent-Managed child." };
  }

  const { data: instance } = await supabase
    .from("chore_instances")
    .select("id, scheduled_date, points, chores ( name, family_id )")
    .eq("id", instanceId)
    .maybeSingle();
  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
  if (!instance || chore?.family_id !== parent.family_id) {
    return { error: "Chore not found." };
  }

  const fullPoints = instance.points ?? 0;
  let awardedPoints: number | null = null;
  if (outcome === "verified_complete") {
    awardedPoints = fullPoints;
  } else if (outcome === "verified_partially_complete") {
    awardedPoints = Number(awardedPointsRaw);
    if (!Number.isFinite(awardedPoints) || awardedPoints < 0 || awardedPoints > fullPoints) {
      return { error: `Awarded points must be between 0 and ${fullPoints}.` };
    }
  }

  const now = new Date().toISOString();
  let finalAssignmentId = assignmentId;

  if (assignmentId) {
    const { data: existing } = await supabase
      .from("chore_assignments")
      .select("id, status, child_id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (!existing || existing.child_id !== childId) {
      return { error: "Assignment not found." };
    }
    if (!["assigned", "accepted", "incomplete"].includes(existing.status)) {
      return { error: "This chore isn't available to mark done right now." };
    }

    const { error: updateError } = await supabase
      .from("chore_assignments")
      .update({
        status: outcome,
        awarded_points: awardedPoints,
        incomplete_reason: outcome === "incomplete" ? incompleteReason : null,
        accepted_at: now,
        submitted_at: now,
        validated_at: now,
        validated_by_parent_id: user.id,
        proof_photo_url: null,
      })
      .eq("id", assignmentId);
    if (updateError) {
      return { error: updateError.message };
    }

    await supabase.from("chore_status_events").insert({
      chore_assignment_id: assignmentId,
      event_type:
        outcome === "verified_complete"
          ? "validated_complete"
          : outcome === "verified_partially_complete"
            ? "validated_partial"
            : "validated_incomplete",
      reason: outcome === "incomplete" ? incompleteReason : null,
    });
  } else {
    // Open chore, no assignment row for this child yet — create it already
    // resolved, since there's no separate accept/submit step here.
    const { data: newAssignment, error: insertError } = await supabase
      .from("chore_assignments")
      .insert({
        chore_instance_id: instanceId,
        child_id: childId,
        status: outcome,
        awarded_points: awardedPoints,
        incomplete_reason: outcome === "incomplete" ? incompleteReason : null,
        accepted_at: now,
        submitted_at: now,
        validated_at: now,
        validated_by_parent_id: user.id,
      })
      .select("id")
      .single();
    if (insertError || !newAssignment) {
      return { error: insertError?.message || "Could not record this chore." };
    }
    finalAssignmentId = newAssignment.id;

    await supabase.from("chore_status_events").insert([
      { chore_assignment_id: newAssignment.id, event_type: "assigned" },
      {
        chore_assignment_id: newAssignment.id,
        event_type:
          outcome === "verified_complete"
            ? "validated_complete"
            : outcome === "verified_partially_complete"
              ? "validated_partial"
              : "validated_incomplete",
        reason: outcome === "incomplete" ? incompleteReason : null,
      },
    ]);
  }

  if (awardedPoints !== null && awardedPoints > 0) {
    await supabase.from("points_ledger").insert({
      child_id: childId,
      delta: awardedPoints,
      type: "chore_award",
      reference_id: finalAssignmentId,
      description: chore?.name ?? "Chore",
    });
  }

  if (outcome === "verified_complete" || outcome === "verified_partially_complete") {
    if (instance.scheduled_date) {
      await advanceStreakThrough(supabase, childId, instance.scheduled_date);
    }
  }

  revalidateAffectedPaths();
  return { success: true };
}

// Direct-apply version of a Chore Freeze — the parent decides for
// themselves rather than a child requesting and a parent approving, so this
// goes straight to "approved" (no weekly free-freeze cap check here, same
// as the existing parent approve-a-request flow in validate/actions.ts).
export async function applyManagedFreeze(_prevState: unknown, formData: FormData) {
  const childId = String(formData.get("childId") || "");
  const from = String(formData.get("freezeFrom") || "");
  const to = String(formData.get("freezeTo") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!childId) {
    return { error: "Missing child." };
  }
  if (!from || !to) {
    return { error: "Please choose a start and end date." };
  }
  if (to < from) {
    return { error: "End date can't be before the start date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { error: "Could not find your family." };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, is_parent_managed")
    .eq("id", childId)
    .eq("family_id", parent.family_id)
    .maybeSingle();
  if (!child || !child.is_parent_managed) {
    return { error: "This isn't a Parent-Managed child." };
  }

  const { error } = await supabase.from("chore_freezes").insert({
    child_id: childId,
    freeze_from: from,
    freeze_to: to,
    reason: reason || null,
    status: "approved",
    decided_by_parent_id: user.id,
    decided_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidateAffectedPaths();
  return { success: true };
}

// "Points redemption is a direct 'Adjust Points' action the parent performs
// when they give the child a reward, rather than a request-then-approve
// flow, since there is no child-side request to respond to." — a signed
// ledger entry; positive to reward, negative to correct a mistake.
export async function adjustManagedPoints(_prevState: unknown, formData: FormData) {
  const childId = String(formData.get("childId") || "");
  const amountRaw = formData.get("amount");
  const description = String(formData.get("description") || "").trim();

  if (!childId) {
    return { error: "Missing child." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
    return { error: "Enter a non-zero whole number of points." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { error: "Could not find your family." };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, is_parent_managed")
    .eq("id", childId)
    .eq("family_id", parent.family_id)
    .maybeSingle();
  if (!child || !child.is_parent_managed) {
    return { error: "This isn't a Parent-Managed child." };
  }

  if (amount < 0) {
    const { data: ledgerRows } = await supabase
      .from("points_ledger")
      .select("delta")
      .eq("child_id", childId);
    const currentTotal = (ledgerRows ?? []).reduce((sum, row) => sum + row.delta, 0);
    if (-amount > currentTotal) {
      return { error: `This child only has ${currentTotal} points — can't deduct more than that.` };
    }
  }

  const { error } = await supabase.from("points_ledger").insert({
    child_id: childId,
    delta: amount,
    type: "manual_adjustment",
    description: description || (amount > 0 ? "Reward" : "Adjustment"),
  });

  if (error) {
    return { error: error.message };
  }

  revalidateAffectedPaths();
  return { success: true };
}
