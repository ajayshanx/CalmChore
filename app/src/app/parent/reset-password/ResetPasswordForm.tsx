"use client";

import { useActionState } from "react";
import { resetParentPassword } from "./actions";

const initialState: { error?: string } = {};

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetParentPassword, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-calm-green">
          Set a New Password
        </h1>
        <p className="mb-6 text-center text-sm text-calm-text/70">
          Choose a new password for your Calm Chore account.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password (min. 8 characters)"
            className="rounded-lg border border-calm-green/30 px-4 py-3"
          />
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            className="rounded-lg border border-calm-green/30 px-4 py-3"
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Set Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
