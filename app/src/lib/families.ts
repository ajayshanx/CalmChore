import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Works with either the RLS-scoped parent client or the service-role client
// (both are used to reach this table depending on which actor is asking).
export async function getFamilyTimezone(
  supabase: SupabaseClient,
  familyId: string
): Promise<string> {
  const { data } = await supabase
    .from("families")
    .select("timezone")
    .eq("id", familyId)
    .maybeSingle();

  return data?.timezone || "UTC";
}
