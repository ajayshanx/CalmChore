"use client";

import { useActionState, useState } from "react";
import { validateChoreAssignment } from "./actions";
import type { ValidationRow } from "./ValidateView";
import AwardBadgeForm from "@/components/badges/AwardBadgeForm";
import FaceIcon from "@/components/icons/FaceIcon";

const initialState: { error?: string; success?: boolean } = {};

const OUTCOME_LABELS: Record<string, string> = {
  verified_complete: "Marked Complete",
  verified_partially_complete: "Marked Partially Complete",
  incomplete: "Marked Incomplete",
};

export default function ValidatePopup({
  row,
  onClose,
}: {
  row: ValidationRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(validateChoreAssignment, initialState);
  const [outcome, setOutcome] = useState<
    "verified_complete" | "verified_partially_complete" | "incomplete" | null
  >(null);

  // Deliberately does NOT auto-close on a successful outcome (unlike the
  // child-side Accept/Submit popups) — a parent often wants to award a badge
  // for this same submission right after confirming the outcome, and an
  // auto-close would yank the popup away (and the row out of the pending
  // list) before they get the chance. Instead the outcome picker is replaced
  // with a confirmation once saved, and the parent closes manually via ✕
  // whenever they're done — including after awarding a badge below.

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-calm-green">{row.choreName}</h3>
          <button onClick={onClose} className="text-calm-text/50">
            ✕
          </button>
        </div>

        <dl className="mb-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Nickname</dt>
            <dd>{row.childLabel}</dd>
          </div>
          {row.scheduledDate && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Chore Date</dt>
              <dd className={row.dateFlag ? "font-medium text-amber-700" : undefined}>
                {new Date(`${row.scheduledDate}T00:00:00Z`).toLocaleDateString(undefined, {
                  timeZone: "UTC",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {row.dateFlag === "late" ? " ⚠ late" : row.dateFlag === "early" ? " ⚠ early" : ""}
              </dd>
            </div>
          )}
          {row.submittedAt && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Submitted On</dt>
              <dd>{new Date(row.submittedAt).toLocaleString()}</dd>
            </div>
          )}
          {row.deadlineAt && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Deadline</dt>
              <dd>{new Date(row.deadlineAt).toLocaleString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Points</dt>
            <dd>{row.points}</dd>
          </div>
        </dl>

        {row.photoUrl && !state?.success && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.photoUrl}
              alt="Proof of chore completion"
              className="w-full rounded-lg border border-calm-green/20"
            />
            <p className="mt-1 text-xs text-calm-text/60">
              This photo is permanently deleted once you select an outcome below.
            </p>
          </div>
        )}
        {row.photoUrl && state?.success && (
          <p className="mb-4 text-xs text-calm-text/60">Photo deleted, as promised above.</p>
        )}

        {state?.success ? (
          <div className="rounded-lg bg-calm-greenLight px-4 py-3 text-sm font-medium text-calm-green">
            ✓ {OUTCOME_LABELS[outcome ?? ""] ?? "Saved"} — you can close this or award a badge below.
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="assignmentId" value={row.assignmentId} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOutcome("verified_complete")}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  outcome === "verified_complete"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-calm-green/30 text-calm-text/70"
                }`}
              >
                <FaceIcon status="verified_complete" size={24} />
                Completed
              </button>
              <button
                type="button"
                onClick={() => setOutcome("verified_partially_complete")}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  outcome === "verified_partially_complete"
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : "border-calm-green/30 text-calm-text/70"
                }`}
              >
                <FaceIcon status="verified_partially_complete" size={24} />
                Partially Complete
              </button>
              <button
                type="button"
                onClick={() => setOutcome("incomplete")}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  outcome === "incomplete"
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-calm-green/30 text-calm-text/70"
                }`}
              >
                <FaceIcon status="incomplete" size={24} />
                Incomplete
              </button>
            </div>
            <input type="hidden" name="outcome" value={outcome ?? ""} />

            {outcome === "verified_partially_complete" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-calm-text/70">
                  Awarded Points (out of {row.points})
                </span>
                <input
                  name="awardedPoints"
                  type="number"
                  min={0}
                  max={row.points}
                  defaultValue={row.points}
                  required
                  className="w-32 rounded-lg border border-calm-green/30 px-4 py-2"
                />
              </label>
            )}

            {outcome === "incomplete" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-calm-text/70">
                  Reason for non-completion (visible to your child)
                </span>
                <textarea
                  name="incompleteReason"
                  required
                  rows={2}
                  className="rounded-lg border border-calm-green/30 px-4 py-2"
                />
              </label>
            )}

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

            {outcome && (
              <button
                type="submit"
                disabled={pending}
                className="self-start rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-40"
              >
                {pending ? "Saving…" : "Confirm"}
              </button>
            )}
          </form>
        )}

        <div className="mt-4 border-t border-calm-green/15 pt-3">
          <AwardBadgeForm
            childId={row.childId}
            choreInstanceId={row.choreInstanceId ?? undefined}
            toggleLabel="Award a badge for this"
          />
        </div>
      </div>
    </div>
  );
}
