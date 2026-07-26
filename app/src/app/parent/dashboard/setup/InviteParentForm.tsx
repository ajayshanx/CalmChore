"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteParent } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

export default function InviteParentForm() {
  const [state, formAction, pending] = useActionState(inviteParent, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <input
          name="firstName"
          required
          placeholder="First name"
          className="w-1/2 rounded-lg border border-calm-green/30 px-4 py-2.5"
        />
        <input
          name="lastName"
          required
          placeholder="Last name"
          className="w-1/2 rounded-lg border border-calm-green/30 px-4 py-2.5"
        />
      </div>
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="rounded-lg border border-calm-green/30 px-4 py-2.5"
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-calm-green">
          Invite sent — they&rsquo;ll show as &ldquo;Invited&rdquo; below until they accept.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-calm-green px-5 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "Sending invite…" : "Invite Parent"}
      </button>
    </form>
  );
}
