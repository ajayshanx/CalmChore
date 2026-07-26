"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { addChild } from "./actions";

const ACCENT_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "gold", label: "Gold" },
  { value: "teal", label: "Teal" },
];

const initialState: { error?: string; success?: boolean } = {};

export default function AddChildForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addChild, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state?.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-xl bg-calm-green px-5 py-2.5 text-sm font-medium text-white"
      >
        Add a Child
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-calm-green/20 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-calm-green">Add a Child</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-calm-text/60 underline"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-3">
        <input
          name="username"
          placeholder="Username"
          required
          className="w-1/2 rounded-lg border border-calm-green/30 px-3 py-2"
        />
        <input
          name="passcode"
          placeholder="Passcode"
          required
          className="w-1/2 rounded-lg border border-calm-green/30 px-3 py-2"
        />
      </div>

      <input
        name="nickname"
        placeholder="Nickname (shown in the app)"
        required
        className="rounded-lg border border-calm-green/30 px-3 py-2"
      />

      <select
        name="accentColour"
        required
        defaultValue=""
        className="rounded-lg border border-calm-green/30 px-3 py-2"
      >
        <option value="" disabled>
          Choose an accent colour
        </option>
        {ACCENT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-calm-green px-5 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add Child"}
      </button>
    </form>
  );
}
