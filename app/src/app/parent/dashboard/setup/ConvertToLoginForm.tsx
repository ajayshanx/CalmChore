"use client";

import { useActionState, useState, useEffect } from "react";
import { convertToOwnLogin } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function ConvertToLoginForm({
  childId,
  childLabel,
}: {
  childId: string;
  childLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(convertToOwnLogin, initialState);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state?.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-calm-green underline"
      >
        Give {childLabel} their own login
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          name="username"
          placeholder="Username"
          required
          aria-label={`Username for ${childLabel}`}
          className="w-40 rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
        />
        <input
          name="passcode"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="6-digit passcode"
          aria-label={`Passcode for ${childLabel}`}
          className="w-40 rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
        />
      </div>
      <input type="hidden" name="childId" value={childId} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-calm-text/60 underline"
        >
          Cancel
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
