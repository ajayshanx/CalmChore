"use server";

import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";

export async function subscribeChildPush(sub: { endpoint: string; p256dh: string; auth: string }) {
  const session = await getChildSession();
  if (!session) return;

  const supabase = createServiceClient();
  await supabase.from("push_subscriptions").upsert(
    { child_id: session.childId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    { onConflict: "endpoint" }
  );
}
