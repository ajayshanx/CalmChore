import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FinishSetupForm from "./FinishSetupForm";

export default async function FinishSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/parent");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  // Already fully onboarded (e.g. revisited this URL after finishing) —
  // nothing left to do here.
  if (parent?.status === "active") {
    redirect("/parent/dashboard");
  }

  // Invited parents never set a password (their account was created by the
  // invite, not a signup form) — they need to set one here, alongside T&C.
  const needsPassword = parent?.status === "invited";

  return <FinishSetupForm needsPassword={needsPassword} />;
}
