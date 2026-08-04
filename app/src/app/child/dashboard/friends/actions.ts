"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";
import { notifyAllParents } from "@/lib/notifications";

export type SearchResult = {
  id: string;
  nickname: string;
  status: "none" | "pending_sent" | "pending_received" | "approved";
};

export async function searchFriends(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; results?: SearchResult[] }> {
  const query = String(formData.get("nickname") || "").trim();
  if (!query) {
    return { error: "Enter a nickname to search." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname")
    .ilike("nickname", `%${query}%`)
    .not("nickname", "is", null)
    .neq("id", session.childId)
    .limit(10);

  const results = children ?? [];
  if (results.length === 0) {
    return { results: [] };
  }

  const resultIds = results.map((r) => r.id);
  const { data: existing } = await supabase
    .from("friendships")
    .select("requester_child_id, addressee_child_id, status")
    .or(
      `and(requester_child_id.eq.${session.childId},addressee_child_id.in.(${resultIds.join(",")})),and(addressee_child_id.eq.${session.childId},requester_child_id.in.(${resultIds.join(",")}))`
    );

  const statusByChildId = new Map<string, SearchResult["status"]>();
  for (const row of existing ?? []) {
    const otherId = row.requester_child_id === session.childId ? row.addressee_child_id : row.requester_child_id;
    if (row.status === "approved") {
      statusByChildId.set(otherId, "approved");
    } else if (row.status === "pending") {
      statusByChildId.set(
        otherId,
        row.requester_child_id === session.childId ? "pending_sent" : "pending_received"
      );
    }
  }

  return {
    results: results.map((r) => ({
      id: r.id,
      nickname: r.nickname ?? "",
      status: statusByChildId.get(r.id) ?? "none",
    })),
  };
}

export async function sendFriendRequest(_prevState: unknown, formData: FormData) {
  const addresseeChildId = String(formData.get("addresseeChildId") || "");
  if (!addresseeChildId) {
    return { error: "Missing child." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  if (addresseeChildId === session.childId) {
    return { error: "You can't add yourself as a friend." };
  }

  const supabase = createServiceClient();

  const { data: addressee } = await supabase
    .from("children")
    .select("id, nickname, family_id")
    .eq("id", addresseeChildId)
    .maybeSingle();
  if (!addressee) {
    return { error: "That child couldn't be found." };
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_child_id.eq.${session.childId},addressee_child_id.eq.${addresseeChildId}),and(requester_child_id.eq.${addresseeChildId},addressee_child_id.eq.${session.childId})`
    )
    .maybeSingle();
  if (existing) {
    return { error: existing.status === "approved" ? "You're already friends." : "A request is already pending." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_child_id: session.childId,
    addressee_child_id: addresseeChildId,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  await notifyAllParents(supabase, {
    familyId: addressee.family_id,
    action: "friend_addition",
    message: `${session.nickname} wants to be friends with ${addressee.nickname ?? "your child"}.`,
    link: "/parent/dashboard/progress",
  });

  revalidatePath("/child/dashboard/friends");
  return { success: true };
}

export async function cancelFriendRequest(_prevState: unknown, formData: FormData) {
  const requestId = String(formData.get("requestId") || "");
  if (!requestId) {
    return { error: "Missing request." };
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();

  const { data: request } = await supabase
    .from("friendships")
    .select("id, requester_child_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.requester_child_id !== session.childId) {
    return { error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { error: "Only a pending request can be cancelled." };
  }

  const { error } = await supabase.from("friendships").delete().eq("id", requestId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/child/dashboard/friends");
  return { success: true };
}
