import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationAction } from "@/lib/notificationCatalog";

// Re-exported so existing server-side importers of "@/lib/notifications"
// keep working unchanged — only client components need to import the
// catalog directly (see notificationCatalog.ts for why).
export { NOTIFICATION_ACTIONS, ACTION_LABELS, type NotificationAction } from "@/lib/notificationCatalog";

type NotifyParentParams = {
  familyId: string;
  parentId: string;
  action: NotificationAction;
  message: string;
  link?: string;
};

// Checks this parent's preference for the action (missing row = enabled by
// default, matching the column default) before inserting. Never throws —
// a notification failing to send should never block the action that
// triggered it.
export async function notifyParent(supabase: SupabaseClient, params: NotifyParentParams): Promise<void> {
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("channel_inapp")
    .eq("family_id", params.familyId)
    .eq("scope", "parent")
    .eq("parent_id", params.parentId)
    .eq("action", params.action)
    .maybeSingle();

  if (pref && pref.channel_inapp === false) return;

  await supabase.from("notifications").insert({
    family_id: params.familyId,
    recipient_parent_id: params.parentId,
    action: params.action,
    message: params.message,
    link: params.link ?? null,
  });
}

// Notifies every active parent on the account — used when an event (e.g. a
// child submitting a chore) is relevant to whichever parent(s) are managing
// the family, not just one specific parent.
export async function notifyAllParents(
  supabase: SupabaseClient,
  params: Omit<NotifyParentParams, "parentId"> & { excludeParentId?: string }
): Promise<void> {
  const { data: parents } = await supabase
    .from("parents")
    .select("id")
    .eq("family_id", params.familyId)
    .eq("status", "active");

  for (const p of parents ?? []) {
    if (params.excludeParentId && p.id === params.excludeParentId) continue;
    await notifyParent(supabase, { ...params, parentId: p.id });
  }
}

type NotifyChildParams = {
  familyId: string;
  childId: string;
  action: NotificationAction;
  message: string;
  link?: string;
};

// Children share a single "all children" preference per action (per spec —
// not configurable per individual child), checked here before inserting.
export async function notifyChild(supabase: SupabaseClient, params: NotifyChildParams): Promise<void> {
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("channel_inapp")
    .eq("family_id", params.familyId)
    .eq("scope", "children")
    .eq("action", params.action)
    .maybeSingle();

  if (pref && pref.channel_inapp === false) return;

  await supabase.from("notifications").insert({
    family_id: params.familyId,
    recipient_child_id: params.childId,
    action: params.action,
    message: params.message,
    link: params.link ?? null,
  });
}
