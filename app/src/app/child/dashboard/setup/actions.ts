"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession, setChildSessionCookie } from "@/lib/childSession";

const ACCENT_COLOURS = ["blue", "red", "purple", "orange", "gold", "teal"] as const;

export async function updateChildProfile(_prevState: unknown, formData: FormData) {
  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const nickname = String(formData.get("nickname") || "").trim();
  const accentColour = String(formData.get("accentColour") || "");

  if (!nickname) {
    return { error: "Nickname is required." };
  }
  if (!ACCENT_COLOURS.includes(accentColour as (typeof ACCENT_COLOURS)[number])) {
    return { error: "Please choose a colour." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("children")
    .update({ nickname, accent_colour: accentColour })
    .eq("id", session.childId)
    .eq("family_id", session.familyId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That nickname is already taken. Please choose another." };
    }
    return { error: error.message };
  }

  // The session cookie carries nickname/colour so pages don't need a DB
  // round trip on every load — refresh it now so the change shows up
  // immediately instead of waiting for the next login.
  await setChildSessionCookie({
    childId: session.childId,
    familyId: session.familyId,
    nickname,
    accentColour,
  });

  revalidatePath("/child/dashboard/setup");
  return { success: true };
}
