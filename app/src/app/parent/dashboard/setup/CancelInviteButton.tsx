"use client";

import { useActionState, useState } from "react";
import { cancelParentInvite } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function CancelInviteButton({
  parentId,
  parentLabel,
}: {
  parentId: string;
  parentLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(cancelParentInvite, initialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 underline"
      >
        Cancel Invite
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="parentId" value={parentId} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-calm-text/60">Cancel invite for {parentLabel}?</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-calm-text/60 underline"
        >
          No
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
