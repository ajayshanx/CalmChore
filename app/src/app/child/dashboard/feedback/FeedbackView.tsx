"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitFeedback } from "./actions";

export type FeedbackRow = {
  id: string;
  message: string;
  submittedByType: string;
  submitterLabel: string;
  createdAt: string;
};

const initialState: { error?: string; success?: boolean } = {};

export default function FeedbackView({ feedback }: { feedback: FeedbackRow[] }) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 rounded-xl border border-calm-green/20 bg-white px-4 py-4"
      >
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Found a bug, or have an idea for a new feature?"
          className="w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
        />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send Feedback"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium text-calm-text/70">Family Feedback</p>
        {feedback.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {feedback.map((row) => (
              <li key={row.id} className="rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{row.submitterLabel}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      row.submittedByType === "child"
                        ? "bg-child-tealBg text-calm-text"
                        : "bg-calm-greenLight text-calm-green"
                    }`}
                  >
                    {row.submittedByType === "child" ? "Child" : "Parent"}
                  </span>
                </div>
                <p className="mt-1 text-calm-text/80">{row.message}</p>
                <p className="mt-1 text-xs text-calm-text/40">{new Date(row.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/60">No feedback yet.</p>
        )}
      </div>
    </div>
  );
}
