"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";

export async function requestFreeze(_prevState: unknown, formData: FormData) {
  const from = String(formData.get("freezeFrom") || "");
  const to = String(formData.get("freezeTo") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!from || !to) {
    return { error: "Please choose a start and end date." };
  }
  if (to < from) {
    return { error: "End date can't be before the start date." };
  }
  if (!reason) {
    return { error: "Please tell your parent why you need this freeze." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("chore_freezes").insert({
    child_id: session.childId,
    freeze_from: from,
    freeze_to: to,
    reason,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/points");
  return { success: true };
}

export async function cancelFreezeRequest(_prevState: unknown, formData: FormData) {
  const freezeId = String(formData.get("freezeId") || "");
  if (!freezeId) {
    return { error: "Missing request." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();
  const { data: freeze } = await supabase
    .from("chore_freezes")
    .select("id, child_id, status")
    .eq("id", freezeId)
    .maybeSingle();

  if (!freeze || freeze.child_id !== session.childId) {
    return { error: "Freeze request not found." };
  }
  // Only a request still awaiting a parent's decision can be withdrawn — an
  // automatic freeze already protected a day that's passed, so there's
  // nothing to undo.
  if (freeze.status !== "pending") {
    return { error: "Only a pending request can be cancelled." };
  }

  const { error } = await supabase.from("chore_freezes").delete().eq("id", freezeId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/points");
  return { success: true };
}

export async function acknowledgeFreeze(_prevState: unknown, formData: FormData) {
  const freezeId = String(formData.get("freezeId") || "");
  if (!freezeId) {
    return { error: "Missing freeze." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("chore_freezes")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", freezeId)
    .eq("child_id", session.childId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/calendar");
  revalidatePath("/child/dashboard");
  revalidatePath("/child/dashboard/my-chores");
  return { success: true };
}
