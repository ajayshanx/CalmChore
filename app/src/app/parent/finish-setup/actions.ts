"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionFamilyForParent } from "@/lib/onboarding";

export async function finishParentSetup(_prevState: unknown, formData: FormData) {
  const timezone = String(formData.get("timezone") || "UTC");
  const consent = formData.get("consent") === "on";
  const needsPassword = formData.get("needsPassword") === "true";
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

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

  if (needsPassword) {
    if (!password || password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (password !== confirmPassword) {
      return { error: "Passwords do not match." };
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      return { error: passwordError.message };
    }
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
