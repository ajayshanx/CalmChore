"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpParent } from "./actions";

const initialState: { error?: string } = {};

export default function CreateAccountPage() {
  const [state, formAction, pending] = useActionState(signUpParent, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-calm-green">
          Create Your Calm Chore Account
        </h1>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              name="firstName"
              required
              placeholder="First name"
              className="w-1/2 rounded-lg border border-calm-green/30 px-4 py-3"
            />
            <input
              name="lastName"
              required
              placeholder="Last name"
              className="w-1/2 rounded-lg border border-calm-green/30 px-4 py-3"
            />
          </div>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-lg border border-calm-green/30 px-4 py-3"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            className="rounded-lg border border-calm-green/30 px-4 py-3"
          />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <p className="text-xs text-calm-text/60">
            You&rsquo;ll review and accept our Terms &amp; Conditions once your email is
            confirmed and you log in for the first time.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-40"
          >
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/parent" className="text-calm-text/50 underline">
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
