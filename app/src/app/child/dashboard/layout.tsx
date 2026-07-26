import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function ChildDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-calm-bg">
      <header className="flex items-center justify-between border-b border-calm-green/15 bg-white px-6 py-4">
        <nav className="flex gap-5 text-sm font-medium text-calm-green">
          <Link href="/child/dashboard" className="hover:underline">
            Home
          </Link>
          <Link href="/child/dashboard/calendar" className="hover:underline">
            Calendar
          </Link>
          <Link href="/child/dashboard/my-chores" className="hover:underline">
            My Chores
          </Link>
          <Link href="/child/dashboard/setup" className="hover:underline">
            Setup
          </Link>
        </nav>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
