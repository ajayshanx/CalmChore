"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitFeedback(_prevState: unknown, formData: FormData) {
  const message = String(formData.get("message") || "").trim();
  if (!message) {
    return { error: "Please enter your feedback before submitting." };
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

  const { error } = await supabase.from("feedback").insert({
    family_id: parent.family_id,
    submitted_by_type: "parent",
    submitted_by_parent_id: user.id,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/feedback");
  revalidatePath("/child/dashboard/feedback");
  return { success: true };
}
