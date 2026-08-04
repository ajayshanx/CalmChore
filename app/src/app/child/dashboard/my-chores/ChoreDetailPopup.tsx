"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitChoreProof } from "./actions";
import type { MyChoreRow } from "./MyChoresView";

const initialState: { error?: string; success?: boolean } = {};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

// Custom line-art face icons for the 3 validation outcomes are a deferred
// polish item — using colour + short text label for now, per the spec's
// fallback requirement that a text label always accompanies the icon.
const OUTCOME_STYLE: Record<string, string> = {
  verified_complete: "text-emerald-700",
  verified_partially_complete: "text-amber-700",
  incomplete: "text-red-700",
};

export default function ChoreDetailPopup({
  chore,
  onClose,
}: {
  chore: MyChoreRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(submitChoreProof, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = ["assigned", "accepted", "incomplete"].includes(chore.status);

  // Server Actions here don't automatically close/refresh this popup — the
  // parent list re-fetches via revalidatePath, but this modal's own `chore`
  // prop is a snapshot taken when it was opened, so without this the status
  // (and therefore canSubmit) never changes and the button just sits there
  // with no feedback after a successful submission.
  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  const timeline: { label: string; at: string }[] = [];
  if (chore.acceptedAt) timeline.push({ label: "Accepted", at: chore.acceptedAt });
  if (chore.submittedAt) timeline.push({ label: "Submitted for verification", at: chore.submittedAt });
  if (chore.validatedAt) timeline.push({ label: STATUS_LABELS[chore.status] ?? "Reviewed", at: chore.validatedAt });
  if (chore.deadlineAt && new Date(chore.deadlineAt) > new Date()) {
    timeline.push({ label: "Deadline", at: chore.deadlineAt });
  }
  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-calm-green">{chore.choreName}</h3>
          <button onClick={onClose} className="text-calm-text/50">
            ✕
          </button>
        </div>

        {chore.choreInfo && <p className="mb-3 text-sm text-calm-text/70">{chore.choreInfo}</p>}

        <dl className="mb-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Schedule</dt>
            <dd>
              {chore.date}
              {chore.time ? ` ${chore.time}` : ""}
            </dd>
          </div>
          {chore.deadlineAt && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Deadline</dt>
              <dd>{new Date(chore.deadlineAt).toLocaleString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Points</dt>
            <dd>{chore.points}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Status</dt>
            <dd className={OUTCOME_STYLE[chore.status] ?? ""}>
              {STATUS_LABELS[chore.status] ?? chore.status}
            </dd>
          </div>
          {chore.awardedPoints !== null && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Awarded Points</dt>
              <dd>{chore.awardedPoints}</dd>
            </div>
          )}
        </dl>

        {chore.incompleteReason && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <p className="font-medium">Why it wasn&rsquo;t marked complete:</p>
            <p>{chore.incompleteReason}</p>
          </div>
        )}

        {timeline.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-sm font-medium text-calm-text/70">Timeline</p>
            <ul className="flex flex-col gap-1 text-sm">
              {timeline.map((t, i) => (
                <li key={i} className="flex justify-between">
                  <span>{t.label}</span>
                  <span className="text-calm-text/60">{new Date(t.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canSubmit && (
          <form action={formAction} className="flex flex-col gap-3 border-t border-calm-green/15 pt-4">
            <input type="hidden" name="assignmentId" value={chore.assignmentId} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-calm-text/70">
                {chore.requiresProof ? "Take a photo (proof required)" : "Take a photo (optional)"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                name="photo"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="text-sm"
              />
              {fileName && <span className="text-xs text-calm-text/50">Selected: {fileName}</span>}
            </label>

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-xl bg-calm-green px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Submitting…" : "Submit for Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
