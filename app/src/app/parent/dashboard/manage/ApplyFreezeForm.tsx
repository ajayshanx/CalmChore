"use client";

import { useActionState, useEffect, useRef } from "react";
import { applyManagedFreeze } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function ApplyFreezeForm({ childId }: { childId: string }) {
  const [state, formAction, pending] = useActionState(applyManagedFreeze, initialState);
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
      <p className="text-sm font-medium text-calm-text/70">Apply a Chore Freeze</p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-calm-text/60">From</span>
          <input
            type="date"
            name="freezeFrom"
            required
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-calm-text/60">To</span>
          <input
            type="date"
            name="freezeTo"
            required
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-calm-text/60">Reason (optional)</span>
        <input
          name="reason"
          placeholder="e.g. Visiting grandparents"
          className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {pending ? "Applying…" : "Apply Freeze"}
      </button>
    </form>
  );
}
