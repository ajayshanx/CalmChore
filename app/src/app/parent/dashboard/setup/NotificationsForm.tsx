"use client";

import { useActionState } from "react";
import { saveNotificationPreferences } from "./actions";
import { ACTION_LABELS, NOTIFICATION_ACTIONS, type NotificationAction } from "@/lib/notifications";

const initialState: { error?: string; success?: boolean } = {};

export default function NotificationsForm({
  parentPrefs,
  childrenPrefs,
}: {
  parentPrefs: Record<string, boolean>;
  childrenPrefs: Record<string, boolean>;
}) {
  const [state, formAction, pending] = useActionState(saveNotificationPreferences, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-xs text-calm-text/50">
        In-app notifications only — choose which actions you (and your children, as a group) get
        notified about.
      </p>

      <div className="overflow-x-auto rounded-lg border border-calm-green/20 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-calm-green/15 text-left text-xs text-calm-text/50">
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 text-center font-medium">You</th>
              <th className="px-3 py-2 text-center font-medium">Children</th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_ACTIONS.map((action: NotificationAction) => (
              <tr key={action} className="border-b border-calm-green/10 last:border-b-0">
                <td className="px-3 py-2">{ACTION_LABELS[action]}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    name={`parent_${action}`}
                    defaultChecked={parentPrefs[action] ?? true}
                    className="h-4 w-4 accent-calm-green"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    name={`children_${action}`}
                    defaultChecked={childrenPrefs[action] ?? true}
                    className="h-4 w-4 accent-calm-green"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-calm-green">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Preferences"}
      </button>
    </form>
  );
}
