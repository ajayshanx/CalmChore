import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONSENT_VERSION } from "@/lib/legal/tc-content";

// Creates the family + parent profile + consent_acceptances row for a newly
// (or just-confirmed) authenticated parent, via the provision_family_for_parent
// SECURITY DEFINER database function.
//
// This has to happen server-side in one atomic function rather than three
// separate client inserts: a brand-new parent has no `parents` row yet, so
// current_family_id() (which every family-scoped RLS policy depends on)
// returns null for them. That breaks even the *read-back* of a row they
// just inserted (Postgres enforces the SELECT policy on `INSERT ... RETURNING`
// too), not just the insert itself. Running as SECURITY DEFINER sidesteps
// that bootstrapping problem entirely. The function is idempotent — safe to
// call again if this parent is already provisioned.
export async function provisionFamilyForParent(
  supabase: SupabaseClient,
  params: { userId: string; email: string; firstName: string; lastName: string; timezone: string }
) {
  const { email, firstName, lastName, timezone } = params;

  const { error } = await supabase.rpc("provision_family_for_parent", {
    p_timezone: timezone,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_consent_version: CONSENT_VERSION,
  });

  if (error) {
    throw new Error(error.message);
  }
}
