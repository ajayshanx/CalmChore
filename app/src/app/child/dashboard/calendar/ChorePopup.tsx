"use client";

import { useActionState, useEffect } from "react";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";
import { acceptChoreInstance } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

export default function ChorePopup({
  instance,
  currentChildId,
  onClose,
}: {
  instance: CalendarInstance;
  currentChildId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(acceptChoreInstance, initialState);

  const isUnassigned = instance.assignments.length === 0;
  const myAssignment = instance.assignments.find((a) => a.childId === currentChildId);
  const canAccept =
    isUnassigned ||
    (instance.assignmentType === "multi" && !myAssignment);

  // Same fix as the My Chores submit popup: without this, a successful
  // Accept leaves the popup open showing a stale "Accept" button with no
  // feedback, and tapping it again fails since the chore's already accepted.
  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

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
            <p className="text-sm text-calm-text/60">Unassigned — open for anyone to accept.</p>
          )}
        </div>

        {canAccept && (
          <form action={formAction}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-calm-green px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Accepting…" : "Accept"}
            </button>
          </form>
        )}
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </div>
    </div>
  );
}
