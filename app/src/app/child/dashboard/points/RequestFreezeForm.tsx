"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestFreeze } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function RequestFreezeForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestFreeze, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state?.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-green"
      >
        Request Multi-day Freeze
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-calm-green/20 bg-white px-4 py-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-calm-green">Request a Freeze</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-calm-text/50 underline"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-3">
        <label className="flex-1 text-xs text-calm-text/60">
          From
          <input
            type="date"
            name="freezeFrom"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
        <label className="flex-1 text-xs text-calm-text/60">
          To
          <input
            type="date"
            name="freezeTo"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
      </div>

      <label className="text-xs text-calm-text/60">
        Reason
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="Why do you need this freeze?"
          className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
        />
      </label>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
