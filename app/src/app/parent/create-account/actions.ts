"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionFamilyForParent } from "@/lib/onboarding";

export async function signUpParent(_prevState: unknown, formData: FormData) {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const timezone = String(formData.get("timezone") || "UTC");
  const consent = formData.get("consent") === "on";

  if (!consent) {
    return { error: "Please accept the Terms & Conditions to continue." };
  }
  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Something went wrong creating your account. Please try again." };
  }

  if (!data.session) {
    // Email confirmation is required by this Supabase project's auth settings —
    // no active session yet, so RLS-scoped inserts can't run. The family/parent/
    // consent rows get created the first time this parent successfully logs in
    // (see /parent/finish-setup), once their session exists.
    redirect("/parent/check-email");
  }

  try {
    await provisionFamilyForParent(supabase, {
      userId: data.user.id,
      email,
      firstName,
      lastName,
      timezone,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not finish setting up your account." };
  }

  redirect("/parent/dashboard");
}
