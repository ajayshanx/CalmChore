"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-calm-green">
          Reset Password
        </h1>
        <p className="mb-6 text-center text-sm text-calm-text/70">
          Enter the email on your account and we&rsquo;ll send you a link to set a new password.
        </p>

        {state?.success ? (
          <p className="rounded-lg bg-calm-greenLight px-4 py-3 text-center text-sm font-medium text-calm-green">
            Check your email for a link to reset your password.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="rounded-lg border border-calm-green/30 px-4 py-3"
            />
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/parent" className="text-calm-text/50 underline">
            ← Back to Log In
          </Link>
        </p>
      </div>
    </main>
  );
}
