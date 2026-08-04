import LogoutButton from "./LogoutButton";
import ParentNavMenu from "./ParentNavMenu";
import { createClient } from "@/lib/supabase/server";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import { markNotificationRead, markAllNotificationsRead } from "./notificationActions";

async function getRecentNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, message, link, created_at, read_at")
    .eq("recipient_parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    link: row.link,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const notifications = await getRecentNotifications();

  return (
    <div className="min-h-screen bg-calm-bg">
      <header className="flex items-center justify-between border-b border-calm-green/15 bg-white px-6 py-4">
        <ParentNavMenu />
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
