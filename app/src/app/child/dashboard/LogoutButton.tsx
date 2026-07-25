"use client";

import { logoutChild } from "./actions";

export default function LogoutButton() {
  return (
    <form action={logoutChild}>
      <button
        type="submit"
        className="rounded-xl border-2 border-calm-green px-5 py-2.5 font-medium text-calm-green transition hover:bg-calm-greenLight"
      >
        Log Out
      </button>
    </form>
  );
}
