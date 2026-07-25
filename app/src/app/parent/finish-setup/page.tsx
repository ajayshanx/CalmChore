"use client";

import { useActionState, useState } from "react";
import TermsAndConditions from "@/components/TermsAndConditions";
import { finishParentSetup } from "./actions";

const initialState: { error?: string } = {};

export default function FinishSetupPage() {
  const [state, formAction, pending] = useActionState(finishParentSetup, initialState);
  const [consent, setConsent] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-calm-green">
          One last step
        </h1>
        <p className="mb-6 text-center text-sm text-calm-text/70">
          Your email is confirmed — please review and accept the Terms &amp; Conditions to
          finish setting up your family.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="timezone" id="timezone-field" />
          <TermsAndConditions checked={consent} onChange={setConsent} />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending || !consent}
            className="rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-40"
          >
            {pending ? "Setting up…" : "I Agree — Continue"}
          </button>
        </form>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('timezone-field').value = Intl.DateTimeFormat().resolvedOptions().timeZone;`,
        }}
      />
    </main>
  );
}
