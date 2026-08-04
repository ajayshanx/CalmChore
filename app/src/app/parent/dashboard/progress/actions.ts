"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Decision = "approved" | "rejected";

export async function respondToFriendRequest(_prevState: unknown, formData: FormData) {
  const requestId = String(formData.get("requestId") || "");
  const decision = String(formData.get("decision") || "") as Decision;

  if (!requestId) {
    return { error: "Missing request." };
  }
  if (!["approved", "rejected"].includes(decision)) {
    return { error: "Invalid decision." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS (friendships_select / friendships_update / friendships_delete)
  // already scopes this to a request where one of the account's own
  // children is a party to it.
  const { data: request } = await supabase
    .from("friendships")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return { error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { error: "This request has already been decided." };
  }

  if (decision === "rejected") {
    // friendship_status has no "rejected" value — declining just removes
    // the request rather than storing a reason (per spec, none is needed).
    const { error } = await supabase.from("friendships").delete().eq("id", requestId);
    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("friendships")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_parent_id: user.id,
      })
      .eq("id", requestId);
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/parent/dashboard/progress");
  return { success: true };
}
