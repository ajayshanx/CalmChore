"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateAffectedPaths() {
  revalidatePath("/parent/dashboard/breaks");
  revalidatePath("/parent/dashboard/calendar");
  revalidatePath("/parent/dashboard/validate");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/dashboard/calendar");
  revalidatePath("/child/dashboard/my-chores");
  revalidatePath("/child/dashboard/points");
  revalidatePath("/child/dashboard");
}

export async function createBreak(_prevState: unknown, formData: FormData) {
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const childIds = formData.getAll("childIds").map(String).filter(Boolean);

  if (!startDate || !endDate) {
    return { error: "Please choose a start and end date." };
  }
  if (endDate < startDate) {
    return { error: "End date can't be before the start date." };
  }
  if (childIds.length === 0) {
    return { error: "Select at least one child." };
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
    return { error: "Parent profile not found." };
  }

  const { data: brk, error: breakError } = await supabase
    .from("chore_breaks")
    .insert({
      family_id: parent.family_id,
      start_date: startDate,
      end_date: endDate,
      created_by_parent_id: user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (breakError || !brk) {
    return { error: breakError?.message ?? "Could not create the break." };
  }

  const { error: childrenError } = await supabase
    .from("chore_break_children")
    .insert(childIds.map((childId) => ({ chore_break_id: brk.id, child_id: childId })));

  if (childrenError) {
    return { error: childrenError.message };
  }

  // Any existing chore instance for the affected children, overlapping the
  // break, gets hidden — not deleted, so it restores cleanly if the break is
  // later cancelled. Already-validated outcomes are left alone; that
  // history already happened and shouldn't disappear.
  const { data: instanceRows } = await supabase
    .from("chore_instances")
    .select("id")
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate);
  const instanceIds = (instanceRows ?? []).map((r) => r.id);

  if (instanceIds.length > 0) {
    await supabase
      .from("chore_assignments")
      .update({ hidden_by_break_id: brk.id })
      .in("chore_instance_id", instanceIds)
      .in("child_id", childIds)
      .not("status", "in", "(verified_complete,verified_partially_complete)")
      .is("hidden_by_break_id", null);
  }

  // A break protects the streak on its own, so any freeze (automatic or
  // approved) that falls entirely inside the break range is no longer
  // needed — remove it so it's restored to that week's free-freeze count,
  // per spec. Freezes only partially overlapping the range are left as-is.
  await supabase
    .from("chore_freezes")
    .delete()
    .in("child_id", childIds)
    .in("status", ["auto_applied", "approved"])
    .gte("freeze_from", startDate)
    .lte("freeze_to", endDate);

  revalidateAffectedPaths();
  return { success: true };
}

export async function cancelBreak(_prevState: unknown, formData: FormData) {
  const breakId = String(formData.get("breakId") || "");
  if (!breakId) {
    return { error: "Missing break." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS (chore_breaks_family) scopes this to the parent's own family.
  const { data: brk } = await supabase
    .from("chore_breaks")
    .select("id, status")
    .eq("id", breakId)
    .maybeSingle();

  if (!brk) {
    return { error: "Break not found." };
  }
  if (brk.status !== "active") {
    return { error: "This break has already been cancelled." };
  }

  const { error: updateError } = await supabase
    .from("chore_breaks")
    .update({ status: "cancelled" })
    .eq("id", breakId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Restore every assignment this break hid. See streakEngine.ts's note on
  // this action's one known limitation: days already walked into the
  // child's streak before the cancel won't automatically re-open.
  await supabase.from("chore_assignments").update({ hidden_by_break_id: null }).eq("hidden_by_break_id", breakId);

  revalidateAffectedPaths();
  return { success: true };
}
