"use client";

import { useActionState, useEffect, useState } from "react";
import { createChore } from "./actions";
import { FEELS_LIKE_OPTIONS, suggestedPoints } from "@/lib/chores/points";

const initialState: { error?: string; success?: boolean } = {};

export type ChorePrefill = {
  name: string;
  info: string;
  points: number;
  assignmentType?: string;
  requiresProof?: boolean;
};

export default function CreateChoreForm({
  familyChildren,
  prefill,
  onDone,
}: {
  familyChildren: { id: string; label: string }[];
  prefill?: ChorePrefill;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createChore, initialState);
  const [points, setPoints] = useState(prefill?.points ?? 1);
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly" | "monthly">(
    "none"
  );
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
  }, [state?.success, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        name="name"
        required
        defaultValue={prefill?.name}
        placeholder="Chore name"
        className="rounded-lg border border-calm-green/30 px-4 py-3"
      />
      <textarea
        name="info"
        defaultValue={prefill?.info}
        placeholder="Info — what needs to be done"
        rows={2}
        className="rounded-lg border border-calm-green/30 px-4 py-3"
      />

      <div>
        <p className="mb-1 text-sm font-medium text-calm-text/70">Feels like…</p>
        <div className="flex flex-wrap gap-2">
          {FEELS_LIKE_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setPoints(suggestedPoints(minutes))}
              className="rounded-full border border-calm-green/30 px-3 py-1 text-sm text-calm-green hover:bg-calm-greenLight"
            >
              {minutes} min
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-calm-text/70">Points (mandatory)</span>
        <input
          name="points"
          type="number"
          min={1}
          required
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-32 rounded-lg border border-calm-green/30 px-4 py-3"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="requiresProof"
          type="checkbox"
          defaultChecked={prefill?.requiresProof ?? false}
          className="h-4 w-4"
        />
        Requires photo proof
      </label>

      <div>
        <p className="mb-1 text-sm font-medium text-calm-text/70">Assignment type</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="assignmentType"
              value="single"
              defaultChecked={(prefill?.assignmentType ?? "single") === "single"}
            />{" "}
            Single child
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="assignmentType"
              value="multi"
              defaultChecked={prefill?.assignmentType === "multi"}
            />{" "}
            Multiple children
          </label>
        </div>
      </div>

      {familyChildren.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium text-calm-text/70">
            Assign to (optional — leave blank to let any child pick it up)
          </p>
          <div className="flex flex-wrap gap-3">
            {familyChildren.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="assignedTo" value={c.id} />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-sm font-medium text-calm-text/70">Recurring</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["none", "daily", "weekly", "monthly"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 capitalize">
              <input
                type="radio"
                name="recurrenceType"
                value={opt}
                defaultChecked={opt === "none"}
                onChange={() => setRecurrenceType(opt)}
              />
              {opt === "none" ? "No" : opt}
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-calm-text/70">
          {recurrenceType === "none" ? "Date" : "Start date"}
        </span>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={today}
          className="w-48 rounded-lg border border-calm-green/30 px-4 py-3"
        />
      </label>

      {recurrenceType !== "none" && (
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-calm-text/70">End date (optional)</span>
            <input
              name="recurrenceEndDate"
              type="date"
              className="w-48 rounded-lg border border-calm-green/30 px-4 py-3"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-calm-text/70">
              Or number of occurrences
            </span>
            <input
              name="recurrenceCount"
              type="number"
              min={1}
              max={60}
              className="w-32 rounded-lg border border-calm-green/30 px-4 py-3"
            />
          </label>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-40"
      >
        {pending ? "Creating…" : "Create Chore"}
      </button>
    </form>
  );
}
