"use client";

import { useActionState } from "react";
import { updateChildProfile } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

// Tailwind's JIT scanner needs full, literal class strings somewhere in this
// file's source text — it can't resolve `peer-checked:${accent}` at build
// time, since that's only ever assembled at runtime. Each swatchClass below
// is deliberately the complete, unconcatenated className.
const COLOURS: { value: string; label: string; swatchClass: string }[] = [
  {
    value: "blue",
    label: "Blue",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-blueBg ring-2 ring-transparent peer-checked:ring-child-blueAccent peer-checked:ring-offset-2",
  },
  {
    value: "red",
    label: "Red",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-redBg ring-2 ring-transparent peer-checked:ring-child-redAccent peer-checked:ring-offset-2",
  },
  {
    value: "purple",
    label: "Purple",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-purpleBg ring-2 ring-transparent peer-checked:ring-child-purpleAccent peer-checked:ring-offset-2",
  },
  {
    value: "orange",
    label: "Orange",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-orangeBg ring-2 ring-transparent peer-checked:ring-child-orangeAccent peer-checked:ring-offset-2",
  },
  {
    value: "gold",
    label: "Gold",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-goldBg ring-2 ring-transparent peer-checked:ring-child-goldAccent peer-checked:ring-offset-2",
  },
  {
    value: "teal",
    label: "Teal",
    swatchClass:
      "flex h-11 w-11 items-center justify-center rounded-full bg-child-tealBg ring-2 ring-transparent peer-checked:ring-child-tealAccent peer-checked:ring-offset-2",
  },
];

export default function ProfileForm({
  nickname,
  accentColour,
}: {
  nickname: string;
  accentColour: string;
}) {
  const [state, formAction, pending] = useActionState(updateChildProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-calm-text/70">Nickname</span>
        <input
          name="nickname"
          defaultValue={nickname}
          required
          className="rounded-lg border border-calm-green/30 px-4 py-3"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-calm-text/70">Colour</legend>
        <div className="flex flex-wrap gap-3">
          {COLOURS.map((c) => (
            <label key={c.value} className="cursor-pointer">
              <input
                type="radio"
                name="accentColour"
                value={c.value}
                defaultChecked={accentColour === c.value}
                className="peer sr-only"
              />
              <span className={c.swatchClass} title={c.label} aria-hidden />
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-calm-green">Saved!</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-calm-green px-6 py-3 font-medium text-white disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
