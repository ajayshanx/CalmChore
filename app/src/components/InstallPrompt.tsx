"use client";

import { useEffect, useState } from "react";

// "Add to Home Screen Prompt" — Calm Chore Setup.txt: shown the first time
// the app is opened in a browser on a device, by any actor with their own
// login (a parent, an additional parent, or a child logging in directly —
// never a Parent-Managed child, who has no login of their own and so never
// renders the layout this mounts in). Dismissible without blocking use, and
// deliberately NOT a permanent one-time miss — it can reappear on a later
// login on the same device if the app still isn't installed, which is why
// dismissal is tracked in sessionStorage (this browser tab's session) rather
// than localStorage (which would persist forever). Once genuinely installed,
// `display-mode: standalone` becomes true on next open and this stops
// rendering on its own — no separate "installed" flag needed.
const SESSION_DISMISS_KEY = "calmchore_install_prompt_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
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

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || alreadyDismissedThisSession()) return;

    // iOS Safari never fires beforeinstallprompt and can't trigger install
    // programmatically — the spec calls for a walkthrough instead, shown
    // right away rather than waiting on an event that will never come.
    if (isIOS()) {
      setIos(true);
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onAppInstalled() {
      setVisible(false);
      markDismissedThisSession();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    markDismissedThisSession();
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Whether accepted or dismissed via the browser's own confirmation step,
    // this specific prompt instance can't be reused — Chrome only allows it
    // to be triggered once per captured event.
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-calm-green/15 bg-calm-greenLight px-6 py-3 text-sm text-calm-text">
      {ios ? (
        <p>
          Add Calm Chore to your Home Screen: tap the <strong>Share</strong> button in Safari, then{" "}
          <strong>&ldquo;Add to Home Screen.&rdquo;</strong>
        </p>
      ) : (
        <p>Install Calm Chore on this device for quicker, full-screen access.</p>
      )}
      <div className="flex items-center gap-3">
        {!ios && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="rounded-lg bg-calm-green px-3 py-1.5 text-xs font-medium text-white"
          >
            Add to Home Screen
          </button>
        )}
        <button onClick={dismiss} className="text-xs font-medium text-calm-text/60 underline">
          Not now
        </button>
      </div>
    </div>
  );
}
