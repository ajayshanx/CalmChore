"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

const CHORES_LINKS: NavLink[] = [
  { href: "/parent/dashboard/chores", label: "Chores" },
  { href: "/parent/dashboard/calendar", label: "Chore Calendar" },
  { href: "/parent/dashboard/breaks", label: "Chore Breaks" },
];

const CHILD_UPDATES_LINKS: NavLink[] = [
  { href: "/parent/dashboard/progress", label: "Child Progress" },
  { href: "/parent/dashboard/validate", label: "Validate Chores" },
  { href: "/parent/dashboard/redemption", label: "Points Redemption" },
];

const TAIL_LINKS: NavLink[] = [
  { href: "/parent/dashboard/feedback", label: "Feedback" },
  { href: "/parent/dashboard/setup", label: "Setup" },
  { href: "/parent/dashboard/about", label: "About" },
];

const itemClass =
  "rounded px-2 py-1.5 text-calm-text hover:bg-calm-greenLight hover:text-calm-green";

export default function ParentNavMenu({
  managedChildren = [],
}: {
  managedChildren?: { id: string; label: string }[];
}) {
  const [openDesktopGroup, setOpenDesktopGroup] = useState<"chores" | "child" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // "Manage for [Child]" only appears at all if the family has a
  // Parent-Managed child — see "Parent Login Options.txt".
  const manageLabel =
    managedChildren.length === 1
      ? `Manage for ${managedChildren[0].label}`
      : managedChildren.length > 1
        ? "Manage Chores"
        : null;

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
        <Link href="/parent/dashboard" className="hover:underline" onClick={closeAll}>
          Dashboard
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDesktopGroup((g) => (g === "chores" ? null : "chores"))}
            className="flex items-center gap-1 hover:underline"
          >
            Chores
            <span className="text-xs">▾</span>
          </button>
          {openDesktopGroup === "chores" && (
            <div className="absolute left-0 top-full z-20 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-2 shadow-md">
              {CHORES_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDesktopGroup((g) => (g === "child" ? null : "child"))}
            className="flex items-center gap-1 hover:underline"
          >
            Child Updates
            <span className="text-xs">▾</span>
          </button>
          {openDesktopGroup === "child" && (
            <div className="absolute left-0 top-full z-20 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-2 shadow-md">
              {CHILD_UPDATES_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {manageLabel && (
          <Link href="/parent/dashboard/manage" className="hover:underline" onClick={closeAll}>
            {manageLabel}
          </Link>
        )}

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
        </button>
        {mobileOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-calm-green/20 bg-white p-3 shadow-md">
            <Link
              href="/parent/dashboard"
              onClick={closeAll}
              className="rounded px-2 py-2 font-medium text-calm-green hover:bg-calm-greenLight"
            >
              Dashboard
            </Link>

            <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-calm-text/40">
              Chores
            </p>
            {CHORES_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                {l.label}
              </Link>
            ))}

            <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-calm-text/40">
              Child Updates
            </p>
            {CHILD_UPDATES_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className={itemClass}>
                {l.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-1 border-t border-calm-green/10 pt-2">
              {manageLabel && (
                <Link href="/parent/dashboard/manage" onClick={closeAll} className={itemClass}>
                  {manageLabel}
                </Link>
              )}
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
