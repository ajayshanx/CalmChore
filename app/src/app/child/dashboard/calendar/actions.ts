"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";

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
    .select("id, chores!inner ( family_id, assignment_type )")
    .eq("id", instanceId)
    .maybeSingle();

  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
  if (!instance || chore?.family_id !== session.familyId) {
    return { error: "Chore not found." };
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

  const { error } = await supabase.from("chore_assignments").insert({
    chore_instance_id: instanceId,
    child_id: session.childId,
    status: "accepted",
    accepted_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/calendar");
  revalidatePath("/child/dashboard/my-chores");
  return { success: true };
}
