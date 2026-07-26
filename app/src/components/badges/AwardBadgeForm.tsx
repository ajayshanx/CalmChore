"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { awardBadge } from "@/app/parent/dashboard/setup/actions";

const initialState: { error?: string; success?: boolean } = {};

export default function AwardBadgeForm({
  childId,
  choreInstanceId,
  toggleLabel = "Award a badge",
  onAwarded,
}: {
  childId: string;
  choreInstanceId?: string;
  toggleLabel?: string;
  onAwarded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(awardBadge, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOpen(false);
      onAwarded?.();
    }
    // onAwarded is expected to be a stable callback from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-green"
      >
        {toggleLabel}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-calm-green/20 bg-calm-bg p-3"
    >
      <input type="hidden" name="childId" value={childId} />
      {choreInstanceId && <input type="hidden" name="choreInstanceId" value={choreInstanceId} />}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-calm-green">Award a badge</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-calm-text/60 underline"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-2">
        <input
          name="emoji"
          placeholder="🙌"
          required
          maxLength={8}
          className="w-16 rounded-lg border border-calm-green/30 px-2 py-2 text-center text-lg"
        />
        <input
          name="label"
          placeholder="Badge name, e.g. High Five"
          required
          maxLength={40}
          className="flex-1 rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
        />
      </div>

      <input
        name="note"
        placeholder="Optional note (visible to your child)"
        maxLength={140}
        className="rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
      />

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Awarding…" : "Give badge"}
      </button>
    </form>
  );
}
