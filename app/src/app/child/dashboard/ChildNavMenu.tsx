"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

const CHORES_LINKS: NavLink[] = [
  { href: "/child/dashboard/calendar", label: "Calendar" },
  { href: "/child/dashboard/my-chores", label: "My Chores" },
];

const POINTS_LINKS: NavLink[] = [
  { href: "/child/dashboard/points", label: "Points" },
  { href: "/child/dashboard/redeem", label: "Redeem Points" },
];

const TAIL_LINKS: NavLink[] = [
  { href: "/child/dashboard/friends", label: "My Friends" },
  { href: "/child/dashboard/feedback", label: "Feedback" },
  { href: "/child/dashboard/setup", label: "Setup" },
  { href: "/child/dashboard/about", label: "About" },
];

const itemClass =
  "rounded px-2 py-1.5 text-calm-text hover:bg-calm-greenLight hover:text-calm-green";

function Dot({ title }: { title: string }) {
  return <span className="h-2 w-2 rounded-full bg-red-500" title={title} />;
}

export default function ChildNavMenu({ showCalendarBadge }: { showCalendarBadge: boolean }) {
  const [openDesktopGroup, setOpenDesktopGroup] = useState<"chores" | "points" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDesktopGroup(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeAll() {
    setOpenDesktopGroup(null);
    setMobileOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop nav */}
      <nav className="hidden items-center gap-5 text-sm font-medium text-calm-green md:flex">
        <Link href="/child/dashboard" className="hover:underline" onClick={closeAll}>
          Home
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDesktopGroup((g) => (g === "chores" ? null : "chores"))}
            className="flex items-center gap-1 hover:underline"
          >
            Chores
            {showCalendarBadge && <Dot title="New chores since you last checked" />}
            <span className="text-xs">▾</span>
          </button>
          {openDesktopGroup === "chores" && (
            <div className="absolute left-0 top-full z-20 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-2 shadow-md">
              {CHORES_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeAll}
                  className={`${itemClass} flex items-center justify-between`}
                >
                  {l.label}
                  {l.href === "/child/dashboard/calendar" && showCalendarBadge && (
                    <Dot title="New chores since you last checked" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDesktopGroup((g) => (g === "points" ? null : "points"))}
            className="flex items-center gap-1 hover:underline"
          >
            Points
            <span className="text-xs">▾</span>
          </button>
          {openDesktopGroup === "points" && (
            <div className="absolute left-0 top-full z-20 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-2 shadow-md">
              {POINTS_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {TAIL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:underline" onClick={closeAll}>
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md border border-calm-green/20 px-3 py-2 text-sm font-medium text-calm-green"
        >
          <span className="text-base leading-none">☰</span>
          Menu
          {showCalendarBadge && <Dot title="New chores since you last checked" />}
        </button>
        {mobileOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-3 shadow-md">
            <Link
              href="/child/dashboard"
              onClick={closeAll}
              className="rounded px-2 py-2 font-medium text-calm-green hover:bg-calm-greenLight"
            >
              Home
            </Link>

            <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-calm-text/40">
              Chores
            </p>
            {CHORES_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeAll}
                className={`${itemClass} flex items-center justify-between`}
              >
                {l.label}
                {l.href === "/child/dashboard/calendar" && showCalendarBadge && (
                  <Dot title="New chores since you last checked" />
                )}
              </Link>
            ))}

            <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-calm-text/40">
              Points
            </p>
            {POINTS_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                {l.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-1 border-t border-calm-green/10 pt-2">
              {TAIL_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
