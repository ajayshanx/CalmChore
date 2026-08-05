"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addChoreInstance,
  deleteChoreInstance,
  listChoreInstances,
  updateChore,
  type ChoreInstanceRow,
} from "./actions";
import type { ChoreRow } from "./ChoresView";

const initialState: { error?: string; success?: boolean } = {};
const initialDeleteState: { error?: string; success?: boolean; needsConfirm?: boolean } = {};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function InstanceRow({ instance, onDeleted }: { instance: ChoreInstanceRow; onDeleted: () => void }) {
  const [state, formAction, pending] = useActionState(deleteChoreInstance, initialDeleteState);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.needsConfirm) setConfirming(true);
    if (state?.success) onDeleted();
  }, [state, onDeleted]);

  return (
    <li className="rounded-lg border border-calm-green/20 bg-white px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {instance.scheduledDate}
            {instance.scheduledTime ? ` ${instance.scheduledTime}` : ""}
          </p>
          <p className="text-calm-text/60">
            {instance.points} pt{instance.points === 1 ? "" : "s"}
            {instance.deadlineAt ? ` · Due ${new Date(instance.deadlineAt).toLocaleString()}` : ""}
          </p>
          {instance.assignments.length > 0 && (
            <p className="text-calm-text/60">
              {instance.assignments.map((a) => `${a.childLabel} (${a.status})`).join(", ")}
            </p>
          )}
        </div>
        <form action={formAction}>
          <input type="hidden" name="instanceId" value={instance.id} />
          {confirming && <input type="hidden" name="confirmed" value="true" />}
          <button
            type="submit"
            disabled={pending}
            className="whitespace-nowrap text-xs font-medium text-red-600 underline disabled:opacity-40"
          >
            {confirming ? "Confirm delete" : "Delete"}
          </button>
        </form>
      </div>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

export default function ChoreDetailPopup({
  chore,
  familyChildren,
  onClose,
  onDuplicate,
}: {
  chore: ChoreRow;
  familyChildren: { id: string; label: string }[];
  onClose: () => void;
  onDuplicate?: (chore: ChoreRow) => void;
}) {
  const [tab, setTab] = useState<"details" | "instances">("details");
  const [editing, setEditing] = useState(false);
  const [editState, editFormAction, editPending] = useActionState(updateChore, initialState);

  const [instances, setInstances] = useState<ChoreInstanceRow[] | null>(null);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [instanceFilter, setInstanceFilter] = useState<"upcoming" | "all">("upcoming");
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [addState, addFormAction, addPending] = useActionState(addChoreInstance, initialState);

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState]);

  useEffect(() => {
    if (addState?.success) {
      setShowAddInstance(false);
      loadInstances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addState]);

  async function loadInstances() {
    setLoadingInstances(true);
    const rows = await listChoreInstances(chore.id);
    setInstances(rows);
    setLoadingInstances(false);
  }

  useEffect(() => {
    if (tab === "instances" && instances === null) {
      loadInstances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const today = todayStr();
  const visibleInstances = (instances ?? []).filter(
    (i) => instanceFilter === "all" || i.scheduledDate >= today
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-calm-green">{chore.name}</h3>
          <button onClick={onClose} className="text-calm-text/50">
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-4 border-b border-calm-green/15">
          <button
            onClick={() => setTab("details")}
            className={`pb-2 text-sm font-medium ${
              tab === "details" ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setTab("instances")}
            className={`pb-2 text-sm font-medium ${
              tab === "instances" ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
            }`}
          >
            Instances
          </button>
        </div>

        {tab === "details" ? (
          !editing ? (
            <div className="flex flex-col gap-3">
              {chore.info && <p className="text-sm text-calm-text/70">{chore.info}</p>}
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-calm-text/50">Points</dt>
                  <dd>{chore.points}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-calm-text/50">Assignment</dt>
                  <dd>{chore.assignment_type === "multi" ? "Multiple children" : "Single child"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-calm-text/50">Photo proof</dt>
                  <dd>{chore.requires_proof ? "Required" : "Not required"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-calm-text/50">Status</dt>
                  <dd className="capitalize">{chore.status}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-4 self-start">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm font-medium text-calm-green underline"
                >
                  Edit chore
                </button>
                {onDuplicate && (
                  <button
                    onClick={() => onDuplicate(chore)}
                    className="text-sm font-medium text-calm-green underline"
                  >
                    Duplicate
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form action={editFormAction} className="flex flex-col gap-3">
              <input type="hidden" name="choreId" value={chore.id} />
              <div>
                <label className="mb-1 block text-xs font-medium text-calm-text/60">Name</label>
                <input
                  name="name"
                  defaultValue={chore.name}
                  required
                  className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-calm-text/60">Info</label>
                <textarea
                  name="info"
                  defaultValue={chore.info ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-calm-text/60">Points</label>
                <input
                  type="number"
                  name="points"
                  min={1}
                  defaultValue={chore.points}
                  required
                  className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-calm-text/60">Assignment type</label>
                <select
                  name="assignmentType"
                  defaultValue={chore.assignment_type}
                  className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                >
                  <option value="single">Single child</option>
                  <option value="multi">Multiple children</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-calm-text/60">Status</label>
                <select
                  name="status"
                  defaultValue={chore.status}
                  className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requiresProof" defaultChecked={chore.requires_proof} />
                Requires photo proof
              </label>
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
          )
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setInstanceFilter("upcoming")}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    instanceFilter === "upcoming"
                      ? "border-calm-green bg-calm-greenLight text-calm-green"
                      : "border-calm-green/30 text-calm-text/70"
                  }`}
                >
                  Current & Future
                </button>
                <button
                  onClick={() => setInstanceFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    instanceFilter === "all"
                      ? "border-calm-green bg-calm-greenLight text-calm-green"
                      : "border-calm-green/30 text-calm-text/70"
                  }`}
                >
                  All
                </button>
              </div>
              {/* "A chore that isn't recurring will have a single chore
                  instance, with no option to create a new instance" —
                  Calm Chore Creation.txt. */}
              {chore.recurrence_type !== "none" && (
                <button
                  onClick={() => setShowAddInstance((s) => !s)}
                  className="text-sm font-medium text-calm-green underline"
                >
                  {showAddInstance ? "Cancel" : "Add Instance"}
                </button>
              )}
            </div>

            {showAddInstance && chore.recurrence_type !== "none" && (
              <form
                action={addFormAction}
                className="flex flex-col gap-3 rounded-lg border border-calm-green/20 bg-calm-bg p-3"
              >
                <input type="hidden" name="choreId" value={chore.id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-calm-text/60">Date</label>
                  <input
                    type="date"
                    name="scheduledDate"
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
                    className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-calm-text/60">
                    Points (defaults to {chore.points})
                  </label>
                  <input
                    type="number"
                    name="points"
                    min={1}
                    placeholder={String(chore.points)}
                    className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-calm-text/60">
                    Assign to (optional)
                  </label>
                  <div className="flex flex-col gap-1">
                    {familyChildren.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="assignedTo" value={c.id} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
                {addState?.error && <p className="text-sm text-red-600">{addState.error}</p>}
                <button
                  type="submit"
                  disabled={addPending}
                  className="self-start rounded-lg bg-calm-green px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {addPending ? "Adding…" : "Add Instance"}
                </button>
              </form>
            )}

            {loadingInstances ? (
              <p className="text-sm text-calm-text/60">Loading…</p>
            ) : visibleInstances.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {visibleInstances.map((i) => (
                  <InstanceRow key={i.id} instance={i} onDeleted={loadInstances} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-calm-text/60">No instances to show.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
