"use client";

import { useActionState } from "react";
import { toggleChoreLike } from "./actions";
import type { ChoreIdeaRow } from "./ChoresView";

const initialState: { error?: string; success?: boolean } = {};

export default function ChoreIdeaCard({
  idea,
  onAdd,
}: {
  idea: ChoreIdeaRow;
  onAdd: () => void;
}) {
  const [state, formAction, pending] = useActionState(toggleChoreLike, initialState);

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/20 bg-white px-4 py-3">
      <div>
        <p className="font-medium">{idea.name}</p>
        {idea.info && <p className="text-sm text-calm-text/60">{idea.info}</p>}
        <p className="mt-1 text-sm text-calm-text/60">
          {idea.points} pt{idea.points === 1 ? "" : "s"} suggested
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <form action={formAction}>
            <input type="hidden" name="choreId" value={idea.id} />
            <button
              type="submit"
              disabled={pending}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${
                idea.likedByMe
                  ? "border-calm-green bg-calm-greenLight text-calm-green"
                  : "border-calm-green/30 text-calm-text/70"
              }`}
            >
              <span>{idea.likedByMe ? "♥" : "♡"}</span>
              {idea.likeCount}
            </button>
          </form>
        </div>
        <button
          onClick={onAdd}
          className="rounded-lg border border-calm-green px-3 py-1.5 text-sm font-medium text-calm-green hover:bg-calm-greenLight"
        >
          Add as Chore
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </li>
  );
}
