"use client";

import { useActionState, useState } from "react";
import { searchFriends, sendFriendRequest, cancelFriendRequest, type SearchResult } from "./actions";

export type FriendRow = {
  friendshipId: string;
  childId: string;
  nickname: string;
  streak: number;
  totalCompleted: number;
  totalPoints: number;
  tierName: string;
  tierLevel: number;
  last5: { id: string; name: string; date: string | null; points: number }[];
};

export type PendingSentRow = {
  id: string;
  nickname: string;
};

const searchInitialState: { error?: string; results?: SearchResult[] } = {};
const sendInitialState: { error?: string; success?: boolean } = {};
const cancelInitialState: { error?: string; success?: boolean } = {};

const STATUS_TEXT: Record<SearchResult["status"], string> = {
  none: "",
  pending_sent: "Request pending",
  pending_received: "They asked to be your friend — ask your parent to check Child Progress",
  approved: "Already friends",
};

function SearchResultRow({ result }: { result: SearchResult }) {
  const [state, formAction, pending] = useActionState(sendFriendRequest, sendInitialState);
  const done = state?.success || result.status !== "none";

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm">
      <span className="font-medium">{result.nickname}</span>
      {done ? (
        <span className="text-xs text-calm-text/50">
          {state?.success ? "Request sent" : STATUS_TEXT[result.status]}
        </span>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="addresseeChildId" value={result.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-calm-green px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Add Friend"}
          </button>
        </form>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

function SearchForm() {
  const [state, formAction, pending] = useActionState(searchFriends, searchInitialState);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-calm-green/20 bg-white px-4 py-4">
      <p className="text-sm font-medium text-calm-green">Find a Friend</p>
      <form action={formAction} className="flex gap-2">
        <input
          type="text"
          name="nickname"
          placeholder="Search by nickname"
          required
          className="flex-1 rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-calm-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.results && (
        <ul className="mt-1 flex flex-col gap-1.5">
          {state.results.length > 0 ? (
            state.results.map((r) => <SearchResultRow key={r.id} result={r} />)
          ) : (
            <p className="text-sm text-calm-text/50">No one found with that nickname.</p>
          )}
        </ul>
      )}
    </div>
  );
}

function CancelRequestButton({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(cancelFriendRequest, cancelInitialState);
  if (state?.success) return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <button type="submit" disabled={pending} className="text-xs text-red-600 underline disabled:opacity-50">
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function FriendDetailPopup({ friend, onClose }: { friend: FriendRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-lg font-semibold text-calm-green">{friend.nickname}</p>
          <button type="button" onClick={onClose} className="text-calm-text/50">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-calm-green/20 bg-calm-bg px-3 py-2 text-center">
            <p className="text-lg font-semibold text-calm-green">{friend.totalCompleted}</p>
            <p className="text-[11px] text-calm-text/50">Completed</p>
          </div>
          <div className="rounded-lg border border-calm-green/20 bg-calm-bg px-3 py-2 text-center">
            <p className="text-lg font-semibold text-calm-green">{friend.totalPoints}</p>
            <p className="text-[11px] text-calm-text/50">Points</p>
          </div>
          <div className="rounded-lg border border-calm-green/20 bg-calm-bg px-3 py-2 text-center">
            <p className="text-lg font-semibold text-calm-green">{friend.streak}</p>
            <p className="text-[11px] text-calm-text/50">Streak</p>
          </div>
          <div className="rounded-lg border border-calm-green/20 bg-calm-bg px-3 py-2 text-center">
            <p className="text-sm font-semibold text-calm-green">
              {friend.tierName} L{friend.tierLevel}
            </p>
            <p className="text-[11px] text-calm-text/50">Tier</p>
          </div>
        </div>

        <p className="mb-2 mt-4 text-sm font-medium text-calm-text/70">Last 5 Completed Chores</p>
        {friend.last5.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {friend.last5.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-calm-green/15 px-3 py-2 text-sm"
              >
                <span>{c.name}</span>
                <span className="text-xs text-calm-text/50">
                  {c.date ? new Date(c.date).toLocaleDateString() : ""} · {c.points} pt{c.points === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/50">No completed chores yet.</p>
        )}
      </div>
    </div>
  );
}

export default function FriendsView({
  friends,
  pendingRequests,
}: {
  friends: FriendRow[];
  pendingRequests: PendingSentRow[];
}) {
  const [selected, setSelected] = useState<FriendRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <SearchForm />

      {pendingRequests.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-calm-text/70">Pending Requests</p>
          <ul className="flex flex-col gap-1.5">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{r.nickname}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-800">Pending</span>
                  <CancelRequestButton requestId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-calm-text/70">Friends</p>
        {friends.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {friends.map((f) => (
              <li key={f.friendshipId}>
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-left text-sm hover:bg-calm-bg"
                >
                  <span className="font-medium">{f.nickname}</span>
                  <span className="text-xs text-calm-text/50">
                    🔥{f.streak} · {f.totalCompleted} done · {f.totalPoints} pts · {f.tierName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/60">No friends yet — search for someone above!</p>
        )}
      </div>

      {selected && <FriendDetailPopup friend={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
