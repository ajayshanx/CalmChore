"use client";

import { useActionState } from "react";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";
import { assignChildToInstance } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting your review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

export default function ChorePopup({
  instance,
  familyChildren,
  onClose,
}: {
  instance: CalendarInstance;
  familyChildren: { id: string; label: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(assignChildToInstance, initialState);

  const assignedChildIds = new Set(instance.assignments.map((a) => a.childId));
  const canAssignMore =
    instance.assignmentType === "multi" || instance.assignments.length === 0;
  const availableChildren = familyChildren.filter((c) => !assignedChildIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-calm-green">{instance.choreName}</h3>
          <button onClick={onClose} className="text-calm-text/50">
            ✕
          </button>
        </div>

        {instance.choreInfo && <p className="mb-3 text-sm text-calm-text/70">{instance.choreInfo}</p>}

        <dl className="mb-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Schedule</dt>
            <dd>
              {instance.date}
              {instance.time ? ` ${instance.time}` : ""}
            </dd>
          </div>
          {instance.deadlineAt && (
            <div className="flex justify-between">
              <dt className="text-calm-text/50">Deadline</dt>
              <dd>{new Date(instance.deadlineAt).toLocaleString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-calm-text/50">Points</dt>
            <dd>{instance.points}</dd>
          </div>
        </dl>

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-calm-text/70">Assigned To / Accepted By</p>
          {instance.assignments.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {instance.assignments.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span>{a.childLabel}</span>
                  <span className="text-calm-text/60">{STATUS_LABELS[a.status] ?? a.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">Unassigned — open for any child to accept.</p>
          )}
        </div>

        {canAssignMore && availableChildren.length > 0 && (
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="instanceId" value={instance.id} />
            <select
              name="childId"
              required
              className="rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
            >
              <option value="">Assign to…</option>
              {availableChildren.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-calm-green px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Assigning…" : "Assign"}
            </button>
          </form>
        )}
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </div>
    </div>
  );
}
