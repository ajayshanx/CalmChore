"use client";

import { useActionState, useEffect, useState } from "react";
import { markChoreDone } from "./actions";
import type { ManageChoreRow } from "./ManageView";
import FaceIcon, { type FaceStatus } from "@/components/icons/FaceIcon";

const initialState: { error?: string; success?: boolean } = {};

type Outcome = FaceStatus;

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: "verified_complete", label: "Complete" },
  { value: "verified_partially_complete", label: "Partial" },
  { value: "incomplete", label: "Incomplete" },
];

export default function MarkDoneCard({ chore, childId }: { chore: ManageChoreRow; childId: string }) {
  const [state, formAction, pending] = useActionState(markChoreDone, initialState);
  const [rating, setRating] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (state?.success) {
      setRating(false);
      setOutcome(null);
    }
  }, [state?.success]);

  return (
    <li className="rounded-lg border border-calm-green/20 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{chore.choreName}</p>
          <p className="text-sm text-calm-text/60">
            {chore.date}
            {chore.time ? ` ${chore.time}` : ""} · {chore.points} pt{chore.points === 1 ? "" : "s"}
            {chore.requiresProof ? " · Photo proof required" : ""}
          </p>
        </div>
        {!rating && (
          <button
            onClick={() => setRating(true)}
            className="shrink-0 rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white"
          >
            Mark Done
          </button>
        )}
      </div>

      {rating && (
        <form action={formAction} className="mt-3 flex flex-col gap-3 border-t border-calm-green/15 pt-3">
          <input type="hidden" name="instanceId" value={chore.instanceId} />
          <input type="hidden" name="assignmentId" value={chore.assignmentId ?? ""} />
          <input type="hidden" name="childId" value={childId} />
          <input type="hidden" name="requiresProof" value={String(chore.requiresProof)} />

          {chore.requiresProof && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-calm-text/70">Take a live photo (proof required)</span>
              <input type="file" name="photo" accept="image/*" capture="environment" className="text-sm" />
            </label>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-calm-text/70">How did it go?</p>
            <div className="flex gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    outcome === opt.value
                      ? "border-calm-green bg-calm-greenLight text-calm-green"
                      : "border-calm-green/30 text-calm-text/70"
                  }`}
                >
                  <FaceIcon status={opt.value} size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {outcome && <input type="hidden" name="outcome" value={outcome} />}

          {outcome === "verified_partially_complete" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-calm-text/70">
                Points to award (out of {chore.points})
              </span>
              <input
                type="number"
                name="awardedPoints"
                min={0}
                max={chore.points}
                required
                className="w-32 rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
              />
            </label>
          )}

          {outcome === "incomplete" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-calm-text/70">Reason for non-completion</span>
              <textarea
                name="incompleteReason"
                rows={2}
                required
                className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
              />
            </label>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending || !outcome}
              className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRating(false);
                setOutcome(null);
              }}
              className="text-sm text-calm-text/60 underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
