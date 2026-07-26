"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginParent(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // First login after email confirmation: the family/parent/consent rows
  // weren't created at signup time (no session existed yet), so finish that
  // now instead of landing on a broken dashboard.
  const { data: existingParent } = await supabase
    .from("parents")
    .select("id, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!existingParent || existingParent.status !== "active") {
    redirect("/parent/finish-setup");
  }

  redirect("/parent/dashboard");
}
