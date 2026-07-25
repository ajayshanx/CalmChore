"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPasscode } from "@/lib/passcode";
import { setChildSessionCookie } from "@/lib/childSession";

export async function loginChild(_prevState: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const passcode = String(formData.get("passcode") || "").trim();

  if (!username || !passcode) {
    return { error: "Please enter your username and passcode." };
  }

  const supabase = createServiceClient();
  const { data: child, error } = await supabase
    .from("children")
    .select("id, family_id, username, passcode_hash, nickname, accent_colour")
    .eq("username", username)
    .maybeSingle();

  if (error || !child || !child.passcode_hash || !verifyPasscode(passcode, child.passcode_hash)) {
    return { error: "That username or passcode isn't right. Ask a parent for help." };
  }

  await setChildSessionCookie({
    childId: child.id,
    familyId: child.family_id,
    nickname: child.nickname ?? "",
    accentColour: child.accent_colour ?? "blue",
  });

  redirect("/child/dashboard");
}
