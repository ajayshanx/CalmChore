// Minimal service worker whose only job is Web Push delivery: showing a
// system notification and updating the home screen icon badge while the
// app itself isn't open. There's no offline caching here on purpose — this
// app always wants fresh server-rendered data (see src/middleware.ts and
// the RLS fix it's paired with), so a caching service worker would fight
// that goal. Registered by PushSubscribe.tsx.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Calm Chore", body: event.data.text() };
  }

  const title = payload.title || "Calm Chore";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Badging API — sets the number on the home screen/taskbar icon so
      // it's visible without opening the app. Support varies by platform
      // (notably requires iOS 16.4+ and the app added to the home screen),
      // so this is best-effort and never blocks showing the notification.
      try {
        if (self.navigator && "setAppBadge" in self.navigator) {
          if (typeof payload.badgeCount === "number" && payload.badgeCount > 0) {
            await self.navigator.setAppBadge(payload.badgeCount);
          } else {
            await self.navigator.clearAppBadge();
          }
        }
      } catch {
        // Badging API not supported on this platform — the system
        // notification above already surfaced the update.
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = allClients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        existing.navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })()
  );
});
