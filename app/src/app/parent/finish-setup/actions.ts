"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionFamilyForParent } from "@/lib/onboarding";

export async function finishParentSetup(_prevState: unknown, formData: FormData) {
  const timezone = String(formData.get("timezone") || "UTC");
  const consent = formData.get("consent") === "on";

  if (!consent) {
    return { error: "Please accept the Terms & Conditions to continue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/parent");
  }

  const firstName = String(user.user_metadata?.first_name || "");
  const lastName = String(user.user_metadata?.last_name || "");

  try {
    await provisionFamilyForParent(supabase, {
      userId: user.id,
      email: user.email || "",
      firstName,
      lastName,
      timezone,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not finish setting up your account." };
  }

  redirect("/parent/dashboard");
}
