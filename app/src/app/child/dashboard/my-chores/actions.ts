"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";

export async function submitChoreProof(_prevState: unknown, formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  const photo = formData.get("photo") as File | null;

  if (!assignmentId) {
    return { error: "Missing chore." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();

  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select(
      "id, child_id, status, chore_instances ( chores ( family_id, requires_proof ) )"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  const instance = Array.isArray(assignment?.chore_instances)
    ? assignment.chore_instances[0]
    : assignment?.chore_instances;
  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;

  if (!assignment || assignment.child_id !== session.childId || chore?.family_id !== session.familyId) {
    return { error: "Chore not found." };
  }
  if (!["assigned", "accepted", "incomplete"].includes(assignment.status)) {
    return { error: "This chore can't be submitted right now." };
  }
  if (chore?.requires_proof && (!photo || photo.size === 0)) {
    return { error: "This chore requires a photo before you can submit it." };
  }

  let proofPhotoUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.type.split("/")[1] || "jpg";
    const path = `${session.familyId}/${assignmentId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("chore-proofs")
      .upload(path, buffer, { contentType: photo.type });
    if (uploadError) {
      return { error: `Could not upload photo: ${uploadError.message}` };
    }
    proofPhotoUrl = path;
  }

  const { error } = await supabase
    .from("chore_assignments")
    .update({
      status: "unverified",
      proof_photo_url: proofPhotoUrl,
      submitted_at: new Date().toISOString(),
      incomplete_reason: null,
    })
    .eq("id", assignmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/my-chores");
  return { success: true };
}
