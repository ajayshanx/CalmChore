"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeParentPush(sub: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // upsert on endpoint (unique) — re-subscribing the same device/browser
  // just refreshes its keys instead of erroring on the constraint.
  await supabase.from("push_subscriptions").upsert(
    { parent_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    { onConflict: "endpoint" }
  );
}
