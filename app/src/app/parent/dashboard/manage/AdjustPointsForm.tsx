"use client";

import { useActionState, useEffect, useRef } from "react";
import { adjustManagedPoints } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function AdjustPointsForm({ childId }: { childId: string }) {
  const [state, formAction, pending] = useActionState(adjustManagedPoints, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-calm-green/20 bg-white p-4"
    >
      <input type="hidden" name="childId" value={childId} />
      <p className="text-sm font-medium text-calm-text/70">Adjust Points</p>
      <p className="text-xs text-calm-text/50">
        Positive to give a reward, negative to correct a mistake.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-calm-text/60">Points</span>
          <input
            type="number"
            name="amount"
            step={1}
            required
            placeholder="e.g. 5 or -2"
            className="w-32 rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-calm-text/60">Reason (optional)</span>
          <input
            name="description"
            placeholder="e.g. Extra help with dinner"
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
          />
        </label>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
