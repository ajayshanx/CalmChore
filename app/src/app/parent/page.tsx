"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginParent } from "./actions";

const initialState: { error?: string } = {};

function ConfirmLinkNotice() {
  const searchParams = useSearchParams();
  const confirmLinkInvalid = searchParams.get("error") === "confirm-link-invalid";

  if (!confirmLinkInvalid) return null;

  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
      That confirmation link is expired or has already been used. Try logging in — if your
      email isn&rsquo;t confirmed yet, request a new link from{" "}
      <Link href="/parent/create-account" className="underline">
        Create Account
      </Link>
      .
    </p>
  );
}

export default function ParentLoginPage() {
  const [state, formAction, pending] = useActionState(loginParent, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-calm-green">
          Parent Login
        </h1>

        <Suspense fallback={null}>
          <ConfirmLinkNotice />
        </Suspense>

        <form action={formAction} className="flex flex-col gap-4">
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
            placeholder="Password"
            className="rounded-lg border border-calm-green/30 px-4 py-3"
          />
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="mt-3 text-center text-sm">
          <Link href="/parent/forgot-password" className="text-calm-text/50 underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-calm-text/70">
          First time here?{" "}
          <Link href="/parent/create-account" className="font-medium text-calm-green underline">
            Create Account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/" className="text-calm-text/50 underline">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}
