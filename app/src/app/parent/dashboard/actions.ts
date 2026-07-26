"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashPasscode } from "@/lib/passcode";

export async function logoutParent() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/parent");
}

const ACCENT_COLOURS = ["blue", "red", "purple", "orange", "gold", "teal"] as const;

export async function addChild(_prevState: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const passcode = String(formData.get("passcode") || "").trim();
  const nickname = String(formData.get("nickname") || "").trim();
  const accentColour = String(formData.get("accentColour") || "");

  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, dots, dashes, and underscores." };
  }
  if (!passcode || passcode.length < 4) {
    return { error: "Passcode must be at least 4 characters." };
  }
  if (!nickname) {
    return { error: "Nickname is required." };
  }
  if (!ACCENT_COLOURS.includes(accentColour as (typeof ACCENT_COLOURS)[number])) {
    return { error: "Please choose an accent colour." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { error: "Could not find your family." };
  }

  const { error } = await supabase.from("children").insert({
    family_id: parent.family_id,
    username,
    passcode_hash: hashPasscode(passcode),
    nickname,
    accent_colour: accentColour,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That username or nickname is already taken. Please choose another." };
    }
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard");
  return { success: true };
}
