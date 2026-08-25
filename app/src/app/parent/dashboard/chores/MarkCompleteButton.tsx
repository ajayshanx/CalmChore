"use client";

import { useActionState, useState } from "react";
import { markCompleteByParent } from "./actions";

const markCompleteInitialState: { error?: string; success?: boolean } = {};

// Inline action for a child who isn't Parent-Managed and whose assignment is
// still un-submitted (assigned/accepted/incomplete) — lets a parent record
// that the chore was actually done when the child couldn't submit it
// themselves. Two-step confirm (tap once to reveal Confirm/Cancel) since
// this awards points immediately. Extracted out of ChoresView so it can also
// be reused on the dashboard's "Chores Currently Ongoing" section, without
// duplicating the confirm-flow logic in two places.
export default function MarkCompleteButton({ assignmentId }: { assignmentId: string }) {
  const [state, formAction, pending] = useActionState(markCompleteByParent, markCompleteInitialState);
  const [confirming, setConfirming] = useState(false);

  if (state?.success) {
    return <span className="text-xs font-medium text-emerald-700">✓ Recorded</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {confirming ? (
        <>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-calm-green bg-calm-greenLight px-2 py-0.5 text-xs font-medium text-calm-green disabled:opacity-40"
          >
            {pending ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-calm-text/50 underline"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="whitespace-nowrap rounded-full border border-calm-green/30 px-2 py-0.5 text-xs font-medium text-calm-green"
        >
          Mark Complete
        </button>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
