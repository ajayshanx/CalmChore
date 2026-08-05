"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_URL } from "@/lib/supabase/config";

// Per user decision: tell the parent directly if no account matches the
// email they typed (more helpful for a mistyped address), rather than the
// more privacy-preserving generic "check your email regardless" message.
// The existence check has to run against the service-role client — the
// regular client has no session yet at this point, so RLS (scoped to
// current_family_id()) would return nothing no matter what's queried.
export async function requestPasswordReset(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    return { error: "Enter your email address." };
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("parents")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!existing) {
    return { error: "No account found for that email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirm`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
