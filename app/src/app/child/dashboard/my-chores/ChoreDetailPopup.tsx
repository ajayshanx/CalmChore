"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitChoreProof } from "./actions";
import type { MyChoreRow } from "./MyChoresView";
import FaceIcon, { type FaceStatus } from "@/components/icons/FaceIcon";

const initialState: { error?: string; success?: boolean } = {};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

const OUTCOME_STYLE: Record<string, string> = {
  verified_complete: "text-emerald-700",
  verified_partially_complete: "text-amber-700",
  incomplete: "text-red-700",
};

function isOutcome(status: string): status is FaceStatus {
  return status === "verified_complete" || status === "verified_partially_complete" || status === "incomplete";
}

type TimelineEntry = {
  label: string;
  at: string;
  reason?: string | null;
  dotClass: string;
  textClass: string;
  outcome?: FaceStatus;
};

// Same 6 event types logged to chore_status_events — see that table's
// migration for why this exists (a single assignment row's snapshot
// timestamps get overwritten on every incomplete -> resubmit cycle, so they
// can't show "what has happened over time" across more than one cycle).
const EVENT_META: Record<string, { label: string; dotClass: string; textClass: string; outcome?: FaceStatus }> = {
  assigned: { label: "Assigned", dotClass: "bg-calm-text/30", textClass: "text-calm-text" },
  accepted: { label: "Accepted", dotClass: "bg-calm-green", textClass: "text-calm-text" },
  submitted: { label: "Submitted for verification", dotClass: "bg-calm-green", textClass: "text-calm-text" },
  validated_complete: {
    label: "Verified Complete",
    dotClass: "bg-emerald-600",
    textClass: "text-emerald-700",
    outcome: "verified_complete",
  },
  validated_partial: {
    label: "Verified Partially Complete",
    dotClass: "bg-amber-600",
    textClass: "text-amber-700",
    outcome: "verified_partially_complete",
  },
  validated_incomplete: {
    label: "Incomplete",
    dotClass: "bg-red-600",
    textClass: "text-red-700",
    outcome: "incomplete",
  },
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

  const timeline: TimelineEntry[] =
    chore.events.length > 0
      ? chore.events.map((e) => {
          const meta = EVENT_META[e.type] ?? {
            label: e.type,
            dotClass: "bg-calm-text/30",
            textClass: "text-calm-text",
          };
          return { at: e.occurredAt, reason: e.reason, ...meta };
        })
      : // Fallback for assignments created before status-event logging
        // existed — reconstructed from the single-row snapshot, so it only
        // reflects the most recent cycle rather than full history. Built via
        // conditional spread (rather than filter + type-guard) since a
        // mixed-shape array unioned with null/"" doesn't reliably narrow to
        // TimelineEntry[] through .filter() — this previously broke the
        // Vercel build with a type error on this assignment.
        [
          ...(chore.acceptedAt
            ? [
                {
                  label: "Accepted",
                  at: chore.acceptedAt,
                  dotClass: "bg-calm-green",
                  textClass: "text-calm-text",
                } satisfies TimelineEntry,
              ]
            : []),
          ...(chore.submittedAt
            ? [
                {
                  label: "Submitted for verification",
                  at: chore.submittedAt,
                  dotClass: "bg-calm-green",
                  textClass: "text-calm-text",
                } satisfies TimelineEntry,
              ]
            : []),
          ...(chore.validatedAt
            ? [
                {
                  label: STATUS_LABELS[chore.status] ?? "Reviewed",
                  at: chore.validatedAt,
                  reason: chore.incompleteReason,
                  dotClass: "bg-calm-text/50",
                  textClass: OUTCOME_STYLE[chore.status] ?? "text-calm-text",
                  outcome: isOutcome(chore.status) ? chore.status : undefined,
                } satisfies TimelineEntry,
              ]
            : []),
        ];

  // "If there is a deadline to the chore, this should be pre-populated on
  // the timeline (in the future if it has not yet passed)" — shown at its
  // chronological position, styled distinctly while still upcoming.
  if (chore.deadlineAt) {
    const isUpcoming = new Date(chore.deadlineAt) > new Date();
    timeline.push({
      label: isUpcoming ? "Deadline (upcoming)" : "Deadline",
      at: chore.deadlineAt,
      dotClass: isUpcoming ? "bg-calm-text/20" : "bg-calm-text/40",
      textClass: isUpcoming ? "italic text-calm-text/50" : "text-calm-text/70",
    });
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
            <dd className={`flex items-center gap-1.5 ${OUTCOME_STYLE[chore.status] ?? ""}`}>
              {isOutcome(chore.status) && <FaceIcon status={chore.status} size={18} />}
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
            <p className="mb-2 text-sm font-medium text-calm-text/70">Timeline</p>
            <ol className="flex flex-col">
              {timeline.map((t, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span className="absolute left-[9.5px] top-5 h-full w-px bg-calm-green/15" />
                  )}
                  <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                    {t.outcome ? (
                      <FaceIcon status={t.outcome} size={20} />
                    ) : (
                      <span className={`h-2.5 w-2.5 rounded-full ${t.dotClass}`} />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className={`text-sm font-medium ${t.textClass}`}>{t.label}</span>
                      <span className="text-xs text-calm-text/50">
                        {new Date(t.at).toLocaleString()}
                      </span>
                    </div>
                    {t.reason && <p className="mt-0.5 text-xs text-calm-text/60">{t.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
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
