import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Service-role client — bypasses Row Level Security entirely. Server-only,
// never imported into client components. This is how child-facing routes
// read/write data: children authenticate via username+passcode (not
// Supabase Auth), so there's no auth.uid() for RLS to key off for them —
// authorization for child sessions is enforced in application code instead,
// against a signed session cookie issued at child login (see /child login
// route, not yet built in this slice).
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for child-facing server routes."
    );
  }
  return createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
