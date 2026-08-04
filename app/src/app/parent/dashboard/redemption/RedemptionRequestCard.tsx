"use client";

import { useActionState, useState } from "react";
import { approveRedemption, rejectRedemption } from "./actions";
import { CATEGORY_ICONS, CATEGORY_LABELS, formatRequestDetails, type RedemptionCategory } from "@/lib/redemption";
import type { RedemptionRequestRow } from "./RedemptionView";

const initialState: { error?: string; success?: boolean } = {};

export default function RedemptionRequestCard({ row }: { row: RedemptionRequestRow }) {
  const [approveState, approveAction, approvePending] = useActionState(approveRedemption, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRedemption, initialState);
  const [mode, setMode] = useState<"idle" | "approving" | "rejecting">("idle");

  if (approveState?.success || rejectState?.success) return null;

  const icon = CATEGORY_ICONS[row.category as RedemptionCategory] ?? "";
  const label = CATEGORY_LABELS[row.category as RedemptionCategory] ?? row.category;

  return (
    <div className="rounded-lg border border-calm-green/20 bg-white px-4 py-3">
      <p className="font-medium">
        {icon} {label} · {row.childLabel}
      </p>
      <p className="mt-0.5 text-sm text-calm-text/60">{formatRequestDetails(row.category, row.details)}</p>

      {mode === "idle" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("approving")}
            className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode("rejecting")}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            Reject
          </button>
        </div>
      )}

      {mode === "approving" && (
        <form action={approveAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="requestId" value={row.id} />
          <p className="text-xs text-calm-text/60">
            {row.childLabel} currently has <span className="font-medium text-calm-green">{row.childCurrentPoints}</span> points.
          </p>
          <label className="text-xs text-calm-text/60">
            Points to debit
            <input
              type="number"
              name="pointsToDebit"
              min={1}
              max={row.childCurrentPoints}
              required
              className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={approvePending}
              className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {approvePending ? "Confirming…" : "Confirm Debit"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-text/70"
            >
              Cancel
            </button>
          </div>
          {approveState?.error && <p className="text-xs text-red-600">{approveState.error}</p>}
        </form>
      )}

      {mode === "rejecting" && (
        <form action={rejectAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="requestId" value={row.id} />
          <textarea
            name="rejectionReason"
            required
            rows={2}
            placeholder="Reason for declining"
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rejectPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {rejectPending ? "Declining…" : "Confirm Decline"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-text/70"
            >
              Cancel
            </button>
          </div>
          {rejectState?.error && <p className="text-xs text-red-600">{rejectState.error}</p>}
        </form>
      )}
    </div>
  );
}
