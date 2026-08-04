"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_URL } from "@/lib/supabase/config";
import { hashPasscode } from "@/lib/passcode";
import { notifyAllParents, NOTIFICATION_ACTIONS } from "@/lib/notifications";

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

  await notifyAllParents(supabase, {
    familyId: inviter.family_id,
    action: "parent_addition",
    message: `${firstName} ${lastName} was invited to join your family.`,
    link: "/parent/dashboard/setup",
    excludeParentId: user.id,
  });

  revalidatePath("/parent/dashboard/setup");
  return { success: true };
}

export async function cancelParentInvite(_prevState: unknown, formData: FormData) {
  const targetParentId = String(formData.get("parentId") || "");
  if (!targetParentId) {
    return { error: "Missing invite." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: requester } = await supabase
    .from("parents")
    .select("family_id, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!requester || requester.status !== "active") {
    return { error: "Only an active parent on this account can cancel an invite." };
  }

  // Service-role client: there's no DELETE policy on parents for the
  // authenticated role (a parent can't remove their own or anyone else's
  // account via RLS), so this needs to bypass RLS — the checks above and
  // below are what stand in for it here.
  const service = createServiceClient();

  const { data: target } = await service
    .from("parents")
    .select("id, family_id, status")
    .eq("id", targetParentId)
    .maybeSingle();

  if (!target || target.family_id !== requester.family_id) {
    return { error: "Invite not found." };
  }
  if (target.status !== "invited") {
    return { error: "Only a pending invite can be cancelled." };
  }

  // Deletes the auth user, which cascades to the parents row (parents.id
  // has ON DELETE CASCADE against auth.users) — this also frees up the
  // email address so it can be invited again from scratch.
  const { error } = await service.auth.admin.deleteUser(targetParentId);
  if (error) {
    return { error: error.message };
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

  await notifyAllParents(supabase, {
    familyId: parent.family_id,
    action: "child_addition",
    message: `${nickname} was added to the family.`,
    link: "/parent/dashboard/setup",
    excludeParentId: user.id,
  });

  revalidatePath("/parent/dashboard/setup");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

export async function updateFamilyTimezone(_prevState: unknown, formData: FormData) {
  const timezone = String(formData.get("timezone") || "").trim();
  if (!timezone) {
    return { error: "Please choose a timezone." };
  }
  try {
    // Throws for an invalid IANA zone name — cheap validation before it
    // hits every day/week boundary calculation that depends on it.
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { error: "That doesn't look like a valid timezone." };
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

  // RLS (family_update) already scopes this to the parent's own family.
  const { error } = await supabase
    .from("families")
    .update({ timezone })
    .eq("id", parent.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/setup");
  return { success: true };
}

export async function awardBadge(_prevState: unknown, formData: FormData) {
  const childId = String(formData.get("childId") || "");
  const emoji = String(formData.get("emoji") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const choreInstanceId = String(formData.get("choreInstanceId") || "").trim() || null;

  if (!childId) {
    return { error: "Missing child." };
  }
  if (!emoji) {
    return { error: "Pick an emoji for the badge." };
  }
  if ([...emoji].length > 4) {
    return { error: "That doesn't look like a single emoji." };
  }
  if (!label) {
    return { error: "Give the badge a name." };
  }
  if (label.length > 40) {
    return { error: "Keep the badge name under 40 characters." };
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

  // RLS (child_badges_family) scopes this insert to a child in this
  // parent's own family — the child_id itself is the authorization check.
  const { error } = await supabase.from("child_badges").insert({
    child_id: childId,
    emoji,
    label,
    note: note || null,
    chore_instance_id: choreInstanceId,
    awarded_by_parent_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/setup");
  revalidatePath("/parent/dashboard/validate");
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

// No usable ON CONFLICT target for a bulk upsert here (the "parent" and
// "children" scope rows are each covered by their own partial unique index,
// and PostgREST's upsert can't express a partial index's WHERE predicate) —
// so this checks each of the 24 rows (12 actions x 2 scopes) individually
// and updates or inserts as needed. Fine for a settings form saved
// occasionally, not a hot path.
async function upsertNotificationPreference(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: { family_id: string; scope: "parent" | "children"; parent_id: string | null; action: string; channel_inapp: boolean }
) {
  let query = supabase
    .from("notification_preferences")
    .select("id")
    .eq("family_id", row.family_id)
    .eq("scope", row.scope)
    .eq("action", row.action);
  query = row.scope === "parent" ? query.eq("parent_id", row.parent_id) : query.is("parent_id", null);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    await supabase
      .from("notification_preferences")
      .update({ channel_inapp: row.channel_inapp })
      .eq("id", existing.id);
  } else {
    await supabase.from("notification_preferences").insert(row);
  }
}

export async function saveNotificationPreferences(_prevState: unknown, formData: FormData) {
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

  for (const action of NOTIFICATION_ACTIONS) {
    await upsertNotificationPreference(supabase, {
      family_id: parent.family_id,
      scope: "parent",
      parent_id: user.id,
      action,
      channel_inapp: formData.get(`parent_${action}`) === "on",
    });
    await upsertNotificationPreference(supabase, {
      family_id: parent.family_id,
      scope: "children",
      parent_id: null,
      action,
      channel_inapp: formData.get(`children_${action}`) === "on",
    });
  }

  revalidatePath("/parent/dashboard/setup");
  return { success: true };
}
