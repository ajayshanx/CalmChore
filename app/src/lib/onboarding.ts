import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONSENT_VERSION } from "@/lib/legal/tc-content";

// Creates the family + parent profile + consent_acceptances row for a newly
// (or just-confirmed) authenticated parent. Idempotent — if this parent is
// already provisioned (e.g. they hit /parent/finish-setup a second time
// after a page refresh or double-submit), this is a no-op rather than a
// duplicate-key error.
export async function provisionFamilyForParent(
  supabase: SupabaseClient,
  params: { userId: string; email: string; firstName: string; lastName: string; timezone: string }
) {
  const { userId, email, firstName, lastName, timezone } = params;

  const { data: existingParent } = await supabase
    .from("parents")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existingParent) {
    return;
  }

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ timezone })
    .select("id")
    .single();
  if (familyError || !family) {
    throw new Error(familyError?.message || "Could not create family");
  }

  const { error: parentError } = await supabase.from("parents").insert({
    id: userId,
    family_id: family.id,
    first_name: firstName,
    last_name: lastName,
    email,
    status: "active",
  });
  if (parentError) {
    throw new Error(parentError.message);
  }

  const { error: consentError } = await supabase.from("consent_acceptances").insert({
    parent_id: userId,
    version: CONSENT_VERSION,
  });
  if (consentError) {
    throw new Error(consentError.message);
  }
}
