"use client";

import { useActionState, useState } from "react";
import { respondToFriendRequest } from "./actions";
import { pillClass } from "@/lib/chores/calendarColours";
import { tierChipClass } from "@/lib/tiers";

export type ChildProgressRow = {
  id: string;
  label: string;
  colour: string;
  totalCompleted: number;
  totalOngoing: number;
  totalPoints: number;
  streak: number;
  tierName: string;
  tierLevel: number;
  friends: string[];
  last10Completed: { id: string; name: string; validatedAt: string | null }[];
  ongoingChoreNames: string[];
};

export type FriendRequestRow = {
  id: string;
  forChildLabel: string;
  requesterLabel: string;
  requestedAt: string;
};

const initialState: { error?: string; success?: boolean } = {};

function FriendRequestCard({ row }: { row: FriendRequestRow }) {
  const [state, formAction, pending] = useActionState(respondToFriendRequest, initialState);
  if (state?.success) return null;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
      <p className="text-sm text-sky-900">
        <span className="font-medium">{row.requesterLabel}</span> wants to be friends with{" "}
        <span className="font-medium">{row.forChildLabel}</span>.
      </p>
      <div className="mt-2 flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="requestId" value={row.id} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-calm-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Approve
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={row.id} />
          <input type="hidden" name="decision" value="rejected" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </form>
      </div>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-calm-green">{value}</p>
      <p className="text-[10px] text-calm-text/50">{label}</p>
    </div>
  );
}

function ChildRow({ row }: { row: ChildProgressRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-calm-green/20 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left"
      >
        <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass(row.colour)}`}>
          {row.label}
        </span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatCell label="Completed" value={row.totalCompleted} />
          <StatCell label="Ongoing" value={row.totalOngoing} />
          <StatCell label="Points" value={row.totalPoints} />
          <StatCell label="Streak" value={row.streak} />
          <StatCell label="Tier" value={`${row.tierName} L${row.tierLevel}`} />
          <StatCell label="Friends" value={row.friends.length} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-calm-green/10 px-4 py-3">
          <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tierChipClass(row.tierName)}`}>
            🛡️ {row.tierName} · Level {row.tierLevel}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-medium text-calm-text/50">Friends</p>
              {row.friends.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {row.friends.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-calm-text/40">No friends yet.</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-calm-text/50">Last 10 Completed</p>
              {row.last10Completed.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {row.last10Completed.map((c) => (
                    <li key={c.id} className="truncate">
                      {c.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-calm-text/40">Nothing completed yet.</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-calm-text/50">Ongoing Chores</p>
              {row.ongoingChoreNames.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {row.ongoingChoreNames.map((name, i) => (
                    <li key={i} className="truncate">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-calm-text/40">Nothing ongoing.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgressView({
  rows,
  friendRequests,
}: {
  rows: ChildProgressRow[];
  friendRequests: FriendRequestRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {friendRequests.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-calm-text/70">Friend Requests</p>
          <ul className="flex flex-col gap-2">
            {friendRequests.map((row) => (
              <li key={row.id}>
                <FriendRequestCard row={row} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <ChildRow key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-calm-text/60">No children added yet.</p>
      )}
    </div>
  );
}
