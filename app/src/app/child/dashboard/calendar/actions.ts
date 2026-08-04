"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";
import { notifyAllParents } from "@/lib/notifications";

export async function acceptChoreInstance(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  if (!instanceId) {
    return { error: "Missing chore." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();

  const { data: instance } = await supabase
    .from("chore_instances")
    .select("id, chores!inner ( name, family_id, assignment_type )")
    .eq("id", instanceId)
    .maybeSingle();

  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
  if (!instance || chore?.family_id !== session.familyId) {
    return { error: "Chore not found." };
  }

  const { data: scheduled } = await supabase
    .from("chore_instances")
    .select("scheduled_date")
    .eq("id", instanceId)
    .maybeSingle();
  if (scheduled?.scheduled_date) {
    const { data: activeBreak } = await supabase
      .from("chore_breaks")
      .select("id, chore_break_children!inner ( child_id )")
      .eq("status", "active")
      .eq("chore_break_children.child_id", session.childId)
      .lte("start_date", scheduled.scheduled_date)
      .gte("end_date", scheduled.scheduled_date)
      .maybeSingle();
    if (activeBreak) {
      return { error: "You're on a Chore Break that day — no need to accept this one." };
    }
  }

  const { data: existingAssignments } = await supabase
    .from("chore_assignments")
    .select("id, child_id")
    .eq("chore_instance_id", instanceId);

  if (chore.assignment_type === "single" && (existingAssignments?.length ?? 0) > 0) {
    return { error: "Someone already accepted this chore." };
  }
  if (existingAssignments?.some((a) => a.child_id === session.childId)) {
    return { error: "You've already accepted this chore." };
  }

  const { data: newAssignment, error } = await supabase
    .from("chore_assignments")
    .insert({
      chore_instance_id: instanceId,
      child_id: session.childId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // This chore had no prior assignment row (the child accepted an
  // open/unassigned chore directly), so there's no earlier "assigned" event
  // to have logged — the timeline starts at Accepted for this cycle.
  if (newAssignment) {
    await supabase
      .from("chore_status_events")
      .insert({ chore_assignment_id: newAssignment.id, event_type: "accepted" });
  }

  await notifyAllParents(supabase, {
    familyId: session.familyId,
    action: "chore_acceptance",
    message: `${session.nickname} accepted the chore: ${chore.name ?? "Chore"}.`,
    link: "/parent/dashboard/calendar",
  });

  revalidatePath("/child/dashboard/calendar");
  revalidatePath("/child/dashboard/my-chores");
  return { success: true };
}
