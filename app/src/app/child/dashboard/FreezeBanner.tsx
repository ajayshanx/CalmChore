"use client";

import { useActionState, useEffect, useState } from "react";
import { acknowledgeFreeze } from "./points/actions";

export type UnackedFreeze = {
  id: string;
  freezeFrom: string;
  freezeTo: string;
};

function formatFreezeDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

const initialState: { error?: string; success?: boolean } = {};

function FreezeBannerRow({ freeze }: { freeze: UnackedFreeze }) {
  const [state, formAction, pending] = useActionState(acknowledgeFreeze, initialState);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (state?.success) setDismissed(true);
  }, [state?.success]);

  if (dismissed) return null;

  const label =
    freeze.freezeFrom === freeze.freezeTo
      ? formatFreezeDate(freeze.freezeFrom)
      : `${formatFreezeDate(freeze.freezeFrom)} – ${formatFreezeDate(freeze.freezeTo)}`;

  return (
    <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left">
      <p className="text-sm text-sky-900">
        ❄️ Your Chore Freeze was used automatically on {label} since no chores were completed
        that day.
      </p>
      <form action={formAction}>
        <input type="hidden" name="freezeId" value={freeze.id} />
        <button
          type="submit"
          disabled={pending}
          aria-label="Dismiss"
          className="shrink-0 text-sky-700 disabled:opacity-50"
        >
          ✕
        </button>
      </form>
    </div>
  );
}

export default function FreezeBanner({ freezes }: { freezes: UnackedFreeze[] }) {
  if (freezes.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {freezes.map((freeze) => (
        <FreezeBannerRow key={freeze.id} freeze={freeze} />
      ))}
    </div>
  );
}
