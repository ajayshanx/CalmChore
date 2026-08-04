"use client";

import { useState, useTransition } from "react";

export type NotificationItem = {
  id: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationBell({
  notifications,
  markRead,
  markAllRead,
}: {
  notifications: NotificationItem[];
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-calm-green hover:bg-calm-bg"
        aria-label="Notifications"
      >
        <span className="text-lg leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-calm-green/20 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-calm-green/10 px-3 py-2">
              <p className="text-sm font-medium text-calm-green">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => markAllRead())}
                  className="text-xs text-calm-green underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-calm-text/50">No notifications yet.</p>
              ) : (
                <ul className="flex flex-col">
                  {notifications.map((n) => (
                    <li key={n.id} className={`border-b border-calm-green/5 last:border-b-0 ${n.readAt ? "" : "bg-calm-bg"}`}>
                      <a
                        href={n.link ?? "#"}
                        onClick={() => {
                          if (!n.readAt) startTransition(() => markRead(n.id));
                          setOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-calm-text hover:bg-calm-green/5"
                      >
                        {n.message}
                        <span className="mt-0.5 block text-[11px] text-calm-text/40">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
