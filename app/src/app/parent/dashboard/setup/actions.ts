"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_URL } from "@/lib/supabase/config";
import { hashPasscode } from "@/lib/passcode";

export async function inviteParent(_prevState: unknown, formData: FormData) {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: inviter } = await supabase
    .from("parents")
    .select("family_id, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!inviter || inviter.status !== "active") {
    return { error: "Only an active parent on this account can invite another parent." };
  }

  // Creating the auth user and sending the invite email requires the
  // service-role client — regular signup can't do this on someone else's
  // behalf.
  const service = createServiceClient();

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email,
    {
      data: { first_name: firstName, last_name: lastName },
      redirectTo: `${SITE_URL}/auth/confirm`,
    }
  );

  if (inviteError || !invited?.user) {
    const message = inviteError?.message || "Could not send the invite.";
    if (/already registered|already exists|already been registered/i.test(message)) {
      return { error: "That email is already associated with an account." };
    }
    return { error: message };
  }

  // Pre-create the parents row as "invited" so Setup > Profiles shows them
  // immediately, and so the invited parent's own family is already known
  // when they accept (see provision_family_for_parent).
  const { error: parentInsertError } = await service.from("parents").insert({
    id: invited.user.id,
    family_id: inviter.family_id,
    first_name: firstName,
    last_name: lastName,
    email,
    status: "invited",
    invited_by: user.id,
  });

  if (parentInsertError) {
    return { error: parentInsertError.message };
  }

  revalidatePath("/parent/dashboard/setup");
  return { success: true };
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

  revalidatePath("/parent/dashboard/setup");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

export async function resetChildPasscode(_prevState: unknown, formData: FormData) {
  const childId = String(formData.get("childId") || "");
  const passcode = String(formData.get("passcode") || "").trim();

  if (!childId) {
    return { error: "Missing child." };
  }
  if (!/^\d{6}$/.test(passcode)) {
    return { error: "Passcode must be exactly 6 digits." };
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

  const { error } = await supabase
    .from("children")
    .update({ passcode_hash: hashPasscode(passcode) })
    .eq("id", childId)
    .eq("family_id", parent.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/setup");
  return { success: true };
}
