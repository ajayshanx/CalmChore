"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyChild } from "@/lib/notifications";

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
  // children is a party to it — this select doubles as the authorization
  // check.
  const { data: request } = await supabase
    .from("friendships")
    .select("id, status, requester_child_id, addressee_child_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return { error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { error: "This request has already been decided." };
  }

  // The requesting child is very possibly in a different family than this
  // approving parent — notification_preferences/notifications RLS is
  // family-scoped to *this* parent's family, so a cross-family notification
  // insert needs the service-role client. The authorization check above
  // (on the authenticated client) already proved this parent legitimately
  // has a side of this friendship; this is just reading the other side's
  // public nickname to notify them.
  const service = createServiceClient();
  const { data: requester } = await service
    .from("children")
    .select("nickname, username, family_id")
    .eq("id", request.requester_child_id)
    .maybeSingle();
  const { data: addressee } = await service
    .from("children")
    .select("nickname, username")
    .eq("id", request.addressee_child_id)
    .maybeSingle();
  const addresseeLabel = addressee?.nickname || addressee?.username || "your friend";

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

  if (requester?.family_id) {
    await notifyChild(service, {
      familyId: requester.family_id,
      childId: request.requester_child_id,
      action: "friend_addition",
      message:
        decision === "approved"
          ? `${addresseeLabel} accepted your friend request!`
          : `Your friend request to ${addresseeLabel} was declined.`,
      link: "/child/dashboard/friends",
    });
  }

  revalidatePath("/parent/dashboard/progress");
  revalidatePath("/child/dashboard/friends");
  return { success: true };
}
