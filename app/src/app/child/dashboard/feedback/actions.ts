"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";

export async function submitFeedback(_prevState: unknown, formData: FormData) {
  const message = String(formData.get("message") || "").trim();
  if (!message) {
    return { error: "Please enter your feedback before submitting." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("feedback").insert({
    family_id: session.familyId,
    submitted_by_type: "child",
    submitted_by_child_id: session.childId,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/feedback");
  revalidatePath("/parent/dashboard/feedback");
  return { success: true };
}
