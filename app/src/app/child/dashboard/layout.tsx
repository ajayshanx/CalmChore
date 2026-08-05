import LogoutButton from "./LogoutButton";
import ChildNavMenu from "./ChildNavMenu";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import { markChildNotificationRead, markAllChildNotificationsRead } from "./notificationActions";
import InstallPrompt from "@/components/InstallPrompt";

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
        <ChildNavMenu showCalendarBadge={showCalendarBadge} />
        <div className="flex items-center gap-2">
          <NotificationBell
            notifications={notifications}
            markRead={markChildNotificationRead}
            markAllRead={markAllChildNotificationsRead}
          />
          <LogoutButton />
        </div>
      </header>
      <InstallPrompt />
      {children}
    </div>
  );
}
