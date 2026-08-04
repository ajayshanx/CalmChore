"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBreak } from "./actions";
import { pillClass } from "@/lib/chores/calendarColours";

const initialState: { error?: string; success?: boolean } = {};

export default function CreateBreakForm({
  familyChildren,
}: {
  familyChildren: { id: string; label: string; colour: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBreak, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSelectedChildren(new Set());
      setOpen(false);
    }
  }, [state?.success]);

  function toggleChild(id: string) {
    setSelectedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = familyChildren.length > 0 && selectedChildren.size === familyChildren.length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-green"
      >
        Apply a Chore Break
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-calm-green/20 bg-white px-4 py-4"
    >
      {Array.from(selectedChildren).map((id) => (
        <input key={id} type="hidden" name="childIds" value={id} />
      ))}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-calm-green">Apply a Chore Break</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-calm-text/50 underline">
          Cancel
        </button>
      </div>

      <div className="flex gap-3">
        <label className="flex-1 text-xs text-calm-text/60">
          Start Date
          <input
            type="date"
            name="startDate"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
        <label className="flex-1 text-xs text-calm-text/60">
          End Date
          <input
            type="date"
            name="endDate"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-calm-text/60">Applies to</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedChildren(allSelected ? new Set() : new Set(familyChildren.map((c) => c.id)))
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              allSelected ? "border-calm-green bg-calm-green text-white" : "border-calm-green/30 text-calm-green"
            }`}
          >
            All children
          </button>
          {familyChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => toggleChild(child.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedChildren.has(child.id) ? pillClass(child.colour) : "border border-calm-text/20 text-calm-text/50"
              }`}
            >
              {child.label}
            </button>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply Break"}
      </button>
    </form>
  );
}
