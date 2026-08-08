"use client";

import { useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY } from "@/lib/webpush/config";

// Prompts to enable push notifications — dismissible, and re-askable on a
// later visit (sessionStorage, not localStorage), same reasoning as
// InstallPrompt.tsx. Reused for both the parent and child dashboards; each
// passes its own `save` server action so the subscription lands against
// the right parent_id/child_id (see parent/dashboard/pushActions.ts and
// child/dashboard/pushActions.ts).
const SESSION_DISMISS_KEY = "calmchore_push_prompt_dismissed";

type SubscriptionPayload = { endpoint: string; p256dh: string; auth: string };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function alreadyDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissedThisSession() {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    // Private browsing / storage disabled — worst case the banner can show
    // again this session, which is harmless.
  }
}

async function subscribeAndSave(save: (sub: SubscriptionPayload) => Promise<void>) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
}

export default function PushSubscribe({ save }: { save: (sub: SubscriptionPayload) => Promise<void> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      // Already granted on an earlier visit — keep the subscription fresh
      // in the background (e.g. after a browser-initiated key rotation),
      // no need to ask again.
      subscribeAndSave(save).catch(() => {});
      return;
    }

    if (Notification.permission === "denied" || alreadyDismissedThisSession()) return;
    setVisible(true);
  }, [save]);

  async function handleEnable() {
    setVisible(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeAndSave(save);
      }
    } catch {
      // Best-effort — a failed subscribe shouldn't block using the app.
    }
  }

  function dismiss() {
    setVisible(false);
    markDismissedThisSession();
  }

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-calm-green/15 bg-calm-greenLight px-6 py-3 text-sm text-calm-text">
      <p>Turn on notifications so you know the moment there&apos;s something new — even when the app&apos;s closed.</p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleEnable}
          className="rounded-lg bg-calm-green px-3 py-1.5 text-xs font-medium text-white"
        >
          Enable notifications
        </button>
        <button onClick={dismiss} className="text-xs font-medium text-calm-text/60 underline">
          Not now
        </button>
      </div>
    </div>
  );
}
