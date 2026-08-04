"use client";

import { useActionState } from "react";
import { cancelFreezeRequest } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function CancelFreezeButton({ freezeId }: { freezeId: string }) {
  const [state, formAction, pending] = useActionState(cancelFreezeRequest, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="freezeId" value={freezeId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-red-600 underline disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
