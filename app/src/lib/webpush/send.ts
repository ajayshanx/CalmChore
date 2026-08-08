import "server-only";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "./config";

type ServiceClient = ReturnType<typeof createServiceClient>;

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  badgeCount: number;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

let configured = false;
function ensureConfigured(): boolean {
  if (!VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
  return true;
}

async function sendToSubscriptions(service: ServiceClient, subs: SubRow[], payload: PushPayload) {
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 404/410 means the browser/OS has invalidated this subscription
        // (app uninstalled, permission revoked, etc.) — clean it up so
        // future notifications don't keep retrying a dead endpoint.
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await service.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

// Looked up fresh here (rather than trusting a caller-supplied count) so
// the number on the home screen icon always matches what the in-app bell
// would show, including the notification that was just inserted.
async function unreadCount(
  service: ServiceClient,
  column: "recipient_parent_id" | "recipient_child_id",
  id: string
): Promise<number> {
  const { count } = await service
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq(column, id)
    .is("read_at", null);
  return count ?? 0;
}

// Best-effort push delivery on top of the in-app notification that
// notifyParent/notifyChild already wrote — never throws, since a push
// failing to send should never block the action that triggered it (same
// philosophy as notifications.ts). Silently no-ops if VAPID_PRIVATE_KEY
// isn't configured yet, or if this recipient has no subscribed devices.
export async function sendPushToParent(parentId: string, title: string, body: string, url?: string): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const service = createServiceClient();
    const [{ data: subs }, badgeCount] = await Promise.all([
      service.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("parent_id", parentId),
      unreadCount(service, "recipient_parent_id", parentId),
    ]);
    if (!subs || subs.length === 0) return;
    await sendToSubscriptions(service, subs, { title, body, url, badgeCount });
  } catch {
    // See comment above — push is a best-effort enhancement only.
  }
}

export async function sendPushToChild(childId: string, title: string, body: string, url?: string): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const service = createServiceClient();
    const [{ data: subs }, badgeCount] = await Promise.all([
      service.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("child_id", childId),
      unreadCount(service, "recipient_child_id", childId),
    ]);
    if (!subs || subs.length === 0) return;
    await sendToSubscriptions(service, subs, { title, body, url, badgeCount });
  } catch {
    // See comment above — push is a best-effort enhancement only.
  }
}
