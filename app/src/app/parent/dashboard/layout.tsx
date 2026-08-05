import LogoutButton from "./LogoutButton";
import ParentNavMenu from "./ParentNavMenu";
import { createClient } from "@/lib/supabase/server";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import { markNotificationRead, markAllNotificationsRead } from "./notificationActions";

async function getNavData(): Promise<{
  notifications: NotificationItem[];
  managedChildren: { id: string; label: string }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notifications: [], managedChildren: [] };

  const [{ data: notificationRows }, { data: parent }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, message, link, created_at, read_at")
      .eq("recipient_parent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("parents").select("family_id").eq("id", user.id).maybeSingle(),
  ]);

  const notifications: NotificationItem[] = (notificationRows ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    link: row.link,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));

  // Drives whether the "Manage" nav link shows at all — that tab is only
  // relevant to a family with at least one child too young for their own
  // login (see "Calm Chore Setup.txt" -> Parent-Managed).
  let managedChildren: { id: string; label: string }[] = [];
  if (parent?.family_id) {
    const { data: managedRows } = await supabase
      .from("children")
      .select("id, nickname, username")
      .eq("family_id", parent.family_id)
      .eq("is_parent_managed", true)
      .order("created_at", { ascending: true });
    managedChildren = (managedRows ?? []).map((c) => ({
      id: c.id,
      label: c.nickname || c.username || "Child",
    }));
  }

  return { notifications, managedChildren };
}

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { notifications, managedChildren } = await getNavData();

  return (
    <div className="min-h-screen bg-calm-bg">
      <header className="flex items-center justify-between border-b border-calm-green/15 bg-white px-6 py-4">
        <ParentNavMenu managedChildren={managedChildren} />
        <div className="flex items-center gap-2">
          <NotificationBell
            notifications={notifications}
            markRead={markNotificationRead}
            markAllRead={markAllNotificationsRead}
          />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
