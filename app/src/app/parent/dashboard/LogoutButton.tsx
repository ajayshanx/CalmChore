"use client";

import { logoutParent } from "./actions";

export default function LogoutButton() {
  return (
    <form action={logoutParent}>
      <button
        type="submit"
        className="rounded-lg border border-calm-green/30 px-4 py-2 text-sm font-medium text-calm-green transition hover:bg-calm-greenLight"
      >
        Log Out
      </button>
    </form>
  );
}
