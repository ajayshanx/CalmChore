"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addDaysStr } from "@/lib/chores/calendarDates";
import { maybeAwardWeeklyStreakBonus } from "@/lib/points/weeklyBonus";

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
      "id, status, child_id, proof_photo_url, chore_instances ( scheduled_date, points, chores ( name ) )"
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

  // A validated Complete or Partially Complete counts as "did a chore" for
  // that instance's scheduled day, driving the child's streak. Chore
  // Freezes/Breaks (not built yet) will later cover gap days without
  // breaking the streak — for now, any gap day resets it.
  if (outcome === "verified_complete" || outcome === "verified_partially_complete") {
    const day = instance?.scheduled_date;
    if (day) {
      const { data: streak } = await supabase
        .from("child_streaks")
        .select("current_streak_days, last_counted_date, streak_started_date")
        .eq("child_id", assignment.child_id)
        .maybeSingle();

      // Tracks the day (if any) that just got newly locked into the streak
      // this call, and the streak's start date as of right after that — used
      // below to check Weekly Streak Bonus eligibility. Left null for a
      // same-day no-op or an ignored older backfill, since neither of those
      // just completed a week.
      let streakExtendedTo: string | null = null;
      let effectiveStreakStartedDate: string | null = null;

      if (!streak || !streak.last_counted_date) {
        // First chore this child has ever had validated.
        await supabase.from("child_streaks").upsert({
          child_id: assignment.child_id,
          current_streak_days: 1,
          streak_started_date: day,
          last_counted_date: day,
        });
        streakExtendedTo = day;
        effectiveStreakStartedDate = day;
      } else if (day === streak.last_counted_date) {
        // Already credited today via an earlier chore — no-op.
      } else if (day === addDaysStr(streak.last_counted_date, 1)) {
        // Consecutive day — extend the streak.
        await supabase
          .from("child_streaks")
          .update({ current_streak_days: streak.current_streak_days + 1, last_counted_date: day })
          .eq("child_id", assignment.child_id);
        streakExtendedTo = day;
        effectiveStreakStartedDate = streak.streak_started_date;
      } else if (day > streak.last_counted_date) {
        // An uncovered gap (more than a day ahead) breaks the streak and
        // starts a new one from today.
        await supabase
          .from("child_streaks")
          .update({ current_streak_days: 1, streak_started_date: day, last_counted_date: day })
          .eq("child_id", assignment.child_id);
        streakExtendedTo = day;
        effectiveStreakStartedDate = day;
      }
      // day < last_counted_date: an older/backfilled instance validated
      // after a later day was already counted — leave the streak as-is.

      // A Mon-Sun week can only have just become "complete" the moment its
      // Sunday gets locked into an unbroken streak — see weeklyBonus.ts.
      if (
        streakExtendedTo &&
        effectiveStreakStartedDate &&
        new Date(`${streakExtendedTo}T00:00:00Z`).getUTCDay() === 0
      ) {
        await maybeAwardWeeklyStreakBonus(
          supabase,
          assignment.child_id,
          streakExtendedTo,
          effectiveStreakStartedDate
        );
      }
    }
  }

  revalidatePath("/parent/dashboard/validate");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/dashboard");
  return { success: true };
}
