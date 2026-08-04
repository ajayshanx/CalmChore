"use client";

import { useActionState, useState } from "react";
import { decideFreezeRequest } from "./actions";
import type { FreezeRequestRow } from "./ValidateView";

const initialState: { error?: string; success?: boolean } = {};

function formatFreezeDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export default function FreezeRequestCard({ row }: { row: FreezeRequestRow }) {
  const [state, formAction, pending] = useActionState(decideFreezeRequest, initialState);
  const [declining, setDeclining] = useState(false);

  if (state?.success) return null;

  const dateLabel =
    row.freezeFrom === row.freezeTo
      ? formatFreezeDate(row.freezeFrom)
      : `${formatFreezeDate(row.freezeFrom)} – ${formatFreezeDate(row.freezeTo)}`;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
      <p className="font-medium text-sky-900">
        {row.childLabel} · {dateLabel}
      </p>
      {row.reason && <p className="mt-1 text-sm text-sky-900/80">&ldquo;{row.reason}&rdquo;</p>}

      {!declining ? (
        <div className="mt-3 flex gap-2">
          <form action={formAction}>
            <input type="hidden" name="freezeId" value={row.freezeId} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
          </form>
          <button
            type="button"
            onClick={() => setDeclining(true)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            Decline
          </button>
        </div>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="freezeId" value={row.freezeId} />
          <input type="hidden" name="decision" value="declined" />
          <textarea
            name="declineReason"
            required
            rows={2}
            placeholder="Reason for declining"
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Declining…" : "Confirm Decline"}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-text/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
