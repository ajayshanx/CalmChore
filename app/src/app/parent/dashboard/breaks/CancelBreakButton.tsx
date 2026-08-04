"use client";

import { useActionState } from "react";
import { cancelBreak } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function CancelBreakButton({ breakId }: { breakId: string }) {
  const [state, formAction, pending] = useActionState(cancelBreak, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="breakId" value={breakId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-red-600 underline disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel Break"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
