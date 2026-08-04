import Link from "next/link";
import LogoutButton from "./LogoutButton";
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
        <nav className="flex flex-wrap gap-5 text-sm font-medium text-calm-green">
          <Link href="/parent/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/parent/dashboard/chores" className="hover:underline">
            Chores
          </Link>
          <Link href="/parent/dashboard/calendar" className="hover:underline">
            Calendar
          </Link>
          <Link href="/parent/dashboard/validate" className="hover:underline">
            Validate
          </Link>
          <Link href="/parent/dashboard/breaks" className="hover:underline">
            Chore Breaks
          </Link>
          <Link href="/parent/dashboard/redemption" className="hover:underline">
            Points Redemption
          </Link>
          <Link href="/parent/dashboard/progress" className="hover:underline">
            Child Progress
          </Link>
          <Link href="/parent/dashboard/feedback" className="hover:underline">
            Feedback
          </Link>
          <Link href="/parent/dashboard/setup" className="hover:underline">
            Setup
          </Link>
        </nav>
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
