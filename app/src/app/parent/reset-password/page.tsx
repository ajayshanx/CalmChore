import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session means the recovery link's token was never established (e.g.
  // this page was opened directly rather than via the emailed link) — there's
  // nothing to reset here.
  if (!user) {
    redirect("/parent/forgot-password");
  }

  return <ResetPasswordForm />;
}
