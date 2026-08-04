"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";

export async function markChildNotificationRead(id: string) {
  const session = await getChildSession();
  if (!session) return;

  const supabase = createServiceClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_child_id", session.childId);

  revalidatePath("/child/dashboard");
}

export async function markAllChildNotificationsRead() {
  const session = await getChildSession();
  if (!session) return;

  const supabase = createServiceClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_child_id", session.childId)
    .is("read_at", null);

  revalidatePath("/child/dashboard");
}
