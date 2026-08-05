"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPasscode } from "@/lib/passcode";
import { setChildSessionCookie } from "@/lib/childSession";
import { notifyAllParents } from "@/lib/notifications";

// A 6-digit passcode is only a million combinations — with no rate limiting
// this was fully exposed to online brute force (the passcode hash itself is
// scrypt + salt, which only protects against an *offline* attack on a
// stolen hash, not a live guessing script hitting this action repeatedly).
// This app runs serverless (Vercel) with no Redis/in-memory store, so the
// counter lives on the children row itself rather than anywhere ephemeral.
const ATTEMPT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

function minutesRemaining(lockedUntil: string): number {
  return Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000));
}

export async function loginChild(_prevState: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const passcode = String(formData.get("passcode") || "").trim();

  if (!username || !passcode) {
    return { error: "Please enter your username and passcode." };
  }

  const supabase = createServiceClient();
  const { data: child } = await supabase
    .from("children")
    .select(
      "id, family_id, username, passcode_hash, nickname, accent_colour, failed_login_attempts, locked_until"
    )
    .eq("username", username)
    .maybeSingle();

  // Locked accounts are rejected before the passcode is even checked, so a
  // script can't keep probing during the lockout window.
  if (child?.locked_until && new Date(child.locked_until) > new Date()) {
    const minutes = minutesRemaining(child.locked_until);
    return {
      error: `Too many attempts. Try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }, or ask a parent to reset your passcode.`,
    };
  }

  const valid = Boolean(child?.passcode_hash && verifyPasscode(passcode, child.passcode_hash));

  if (!valid) {
    // Same generic message whether the username doesn't exist or the
    // passcode is wrong — deliberately doesn't confirm which one, same as
    // before this change. Only a *found* child accrues an attempt count;
    // there's no row to track against for an unknown username, and doing so
    // (e.g. by IP) isn't reliable in a serverless environment anyway.
    if (child) {
      const attempts = child.failed_login_attempts + 1;
      if (attempts >= ATTEMPT_THRESHOLD) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        await supabase
          .from("children")
          .update({ failed_login_attempts: 0, locked_until: lockedUntil })
          .eq("id", child.id);
        await notifyAllParents(supabase, {
          familyId: child.family_id,
          action: "child_login_locked",
          message: `${child.nickname || child.username}'s login was locked for ${LOCKOUT_MINUTES} minutes after ${ATTEMPT_THRESHOLD} failed passcode attempts.`,
          link: "/parent/dashboard/setup",
        });
      } else {
        await supabase.from("children").update({ failed_login_attempts: attempts }).eq("id", child.id);
      }
    }
    return { error: "That username or passcode isn't right. Ask a parent for help." };
  }

  // `valid` is only true when `child` is non-null (see the `child?.` check
  // above), so this cast is safe.
  const foundChild = child as NonNullable<typeof child>;

  if (foundChild.failed_login_attempts > 0 || foundChild.locked_until) {
    await supabase
      .from("children")
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq("id", foundChild.id);
  }

  await setChildSessionCookie({
    childId: foundChild.id,
    familyId: foundChild.family_id,
    nickname: foundChild.nickname ?? "",
    accentColour: foundChild.accent_colour ?? "blue",
  });

  redirect("/child/dashboard");
}
