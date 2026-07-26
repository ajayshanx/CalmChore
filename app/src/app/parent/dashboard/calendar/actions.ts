"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Adds a child assignment to an instance (turns an unassigned chore into an
// assigned one, or adds another child to a multi-assignment chore). Doesn't
// touch existing assignments — reassigning/removing a child who has already
// accepted or submitted proof is a separate, more careful flow than this
// first pass covers.
export async function assignChildToInstance(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  const childId = String(formData.get("childId") || "");

  if (!instanceId || !childId) {
    return { error: "Missing chore or child." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("chore_assignments")
    .insert({ chore_instance_id: instanceId, child_id: childId, status: "assigned" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}
