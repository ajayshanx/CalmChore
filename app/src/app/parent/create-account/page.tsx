"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import TermsAndConditions from "@/components/TermsAndConditions";
import { signUpParent } from "./actions";

const initialState: { error?: string } = {};

export default function CreateAccountPage() {
  const [state, formAction, pending] = useActionState(signUpParent, initialState);
  const [consent, setConsent] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-calm-green">
          Create Your Calm Chore Account
        </h1>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="timezone" id="timezone-field" />
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

          <TermsAndConditions checked={consent} onChange={setConsent} />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending || !consent}
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

      {/* Capture the browser's timezone as this family's timezone of record */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('timezone-field').value = Intl.DateTimeFormat().resolvedOptions().timeZone;`,
        }}
      />
    </main>
  );
}
