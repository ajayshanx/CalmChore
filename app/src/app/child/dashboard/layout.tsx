import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import { markChildNotificationRead, markAllChildNotificationsRead } from "./notificationActions";

async function getRecentNotifications(childId: string): Promise<NotificationItem[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, message, link, created_at, read_at")
    .eq("recipient_child_id", childId)
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

// True if any chore instance relevant to this child (newly added open chores,
// or chores newly assigned directly to them) was created since they last
// opened the Calendar tab — drives the "new" dot next to the nav link.
async function hasNewCalendarActivity(childId: string, familyId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: child } = await supabase
    .from("children")
    .select("last_calendar_view_at")
    .eq("id", childId)
    .maybeSingle();

  const lastViewedAt = child?.last_calendar_view_at;
  if (!lastViewedAt) return false;

  const timezone = await getFamilyTimezone(supabase, familyId);

  const { data: rows } = await supabase
    .from("chore_instances")
    .select("id, created_at, chores!inner ( family_id ), chore_assignments ( child_id )")
    .eq("chores.family_id", familyId)
    .gte("scheduled_date", todayStrInTimezone(timezone))
    .gt("created_at", lastViewedAt)
    .limit(50);

  return (rows ?? []).some((row) => {
    const assignments = row.chore_assignments ?? [];
    if (assignments.length === 0) return true; // newly added, open for anyone
    return assignments.some((a) => a.child_id === childId); // newly assigned to me
  });
}

export default async function ChildDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getChildSession();
  const showCalendarBadge = session
    ? await hasNewCalendarActivity(session.childId, session.familyId)
    : false;
  const notifications = session ? await getRecentNotifications(session.childId) : [];

  return (
    <div className="min-h-screen bg-calm-bg">
      <header className="flex items-center justify-between border-b border-calm-green/15 bg-white px-6 py-4">
        <nav className="flex gap-5 text-sm font-medium text-calm-green">
          <Link href="/child/dashboard" className="hover:underline">
            Home
          </Link>
          <Link href="/child/dashboard/calendar" className="inline-flex items-center gap-1 hover:underline">
            Calendar
            {showCalendarBadge && (
              <span
                className="h-2 w-2 rounded-full bg-red-500"
                title="New chores since you last checked"
              />
            )}
          </Link>
          <Link href="/child/dashboard/my-chores" className="hover:underline">
            My Chores
          </Link>
          <Link href="/child/dashboard/points" className="hover:underline">
            Points
          </Link>
          <Link href="/child/dashboard/redeem" className="hover:underline">
            Redeem Points
          </Link>
          <Link href="/child/dashboard/feedback" className="hover:underline">
            Feedback
          </Link>
          <Link href="/child/dashboard/setup" className="hover:underline">
            Setup
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <NotificationBell
            notifications={notifications}
            markRead={markChildNotificationRead}
            markAllRead={markAllChildNotificationsRead}
          />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
