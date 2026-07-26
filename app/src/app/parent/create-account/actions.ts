"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/supabase/config";

// Terms & Conditions acceptance (the only point that legally matters — it's
// tied to a real, confirmed identity) happens once, at /parent/finish-setup.
// This step only collects credentials and kicks off email confirmation.
export async function signUpParent(_prevState: unknown, formData: FormData) {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Something went wrong creating your account. Please try again." };
  }

  if (!data.session) {
    // Normal path: email confirmation is required, so there's no session yet.
    // /auth/confirm establishes one once the parent clicks the email link,
    // then sends them to finish-setup for T&C + family provisioning.
    redirect("/parent/check-email");
  }

  // Email confirmation disabled for this project — session exists already.
  redirect("/parent/finish-setup");
}
