"use client";

import { useActionState, useEffect, useState } from "react";
import type { CalendarInstance } from "@/components/chores/CalendarGrid";
import { assignChildToInstance, unassignChildFromInstance, updateInstanceSchedule } from "./actions";
import FaceIcon, { type FaceStatus } from "@/components/icons/FaceIcon";

const initialState: { error?: string; success?: boolean } = {};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting your review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

function isOutcome(status: string): status is FaceStatus {
  return status === "verified_complete" || status === "verified_partially_complete" || status === "incomplete";
}

// yyyy-mm-ddThh:mm, in local time, for a <input type="datetime-local"> value.
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function ChorePopup({
  instance,
  familyChildren,
  onClose,
}: {
  instance: CalendarInstance;
  familyChildren: { id: string; label: string }[];
  onClose: () => void;
}) {
  const [assignState, assignFormAction, assignPending] = useActionState(
    assignChildToInstance,
    initialState
  );
  const [unassignState, unassignFormAction, unassignPending] = useActionState(
    unassignChildFromInstance,
    initialState
  );
  const [editState, editFormAction, editPending] = useActionState(
    updateInstanceSchedule,
    initialState
  );
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState]);

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

        {!editing ? (
          <>
            <dl className="mb-3 flex flex-col gap-1 text-sm">
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
            <button
              onClick={() => setEditing(true)}
              className="mb-4 text-sm font-medium text-calm-green underline"
            >
              Edit schedule / points
            </button>
          </>
        ) : (
          <form action={editFormAction} className="mb-4 flex flex-col gap-3">
            <input type="hidden" name="instanceId" value={instance.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-calm-text/60">Date</label>
              <input
                type="date"
                name="scheduledDate"
                defaultValue={instance.date}
                required
                className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-calm-text/60">
                Time (optional)
              </label>
              <input
                type="time"
                name="scheduledTime"
                defaultValue={instance.time ?? ""}
                className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-calm-text/60">
                Deadline (optional)
              </label>
              <input
                type="datetime-local"
                name="deadlineAt"
                defaultValue={toDatetimeLocalValue(instance.deadlineAt)}
                className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-calm-text/60">Points</label>
              <input
                type="number"
                name="points"
                min={1}
                defaultValue={instance.points}
                required
                className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
              />
            </div>
            {editState?.error && <p className="text-sm text-red-600">{editState.error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={editPending}
                className="rounded-lg bg-calm-green px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {editPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-calm-text/60 underline"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-calm-text/70">Assigned To / Accepted By</p>
          {instance.assignments.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {instance.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.childLabel}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-calm-text/60">
                      {isOutcome(a.status) && <FaceIcon status={a.status} size={16} />}
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                    {a.status === "assigned" && (
                      <form action={unassignFormAction}>
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <button
                          type="submit"
                          disabled={unassignPending}
                          className="text-xs text-red-600 underline disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">Unassigned — open for any child to accept.</p>
          )}
          {unassignState?.error && <p className="mt-1 text-sm text-red-600">{unassignState.error}</p>}
        </div>

        {canAssignMore && availableChildren.length > 0 && (
          <form action={assignFormAction} className="flex flex-wrap items-center gap-2">
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
              disabled={assignPending}
              className="rounded-lg bg-calm-green px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {assignPending ? "Assigning…" : "Assign"}
            </button>
          </form>
        )}
        {assignState?.error && <p className="mt-2 text-sm text-red-600">{assignState.error}</p>}
      </div>
    </div>
  );
}
