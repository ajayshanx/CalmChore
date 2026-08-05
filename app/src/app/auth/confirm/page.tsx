"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// This used to be a server Route Handler, but Supabase's confirmation/invite
// emails use the DEFAULT template (custom templates require SMTP, which
// isn't configured) — that template's link goes through Supabase's own
// /auth/v1/verify, which on success redirects here with the session in the
// URL *fragment* (#access_token=...), not as query params. Fragments never
// reach the server, so this has to run client-side.
//
// This also happens to be the fix for email-link prescanning (Outlook Safe
// Links, Apple Mail privacy protection, etc. "clicking" the link before the
// real user does, silently burning the one-time token and leaving the real
// click showing "expired or already used"): those scanners fetch the HTML
// but don't execute JavaScript, so the token-consuming call below — which
// only runs client-side, on this page's mount — is never triggered by a
// passive prefetch. Only an actual browser opening the link for real
// establishes the session.
function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();

      // Password recovery links carry `type=recovery` as a query param
      // alongside the token in the fragment (both signup-confirm and
      // recovery emails route through the same /auth/v1/verify endpoint) —
      // once the session is established, that's what tells us to send the
      // parent to set a new password instead of finish-setup, which would
      // otherwise incorrectly re-run family provisioning / T&C acceptance.
      const typeParam = searchParams.get("type");
      const destination = typeParam === "recovery" ? "/parent/reset-password" : "/parent/finish-setup";

      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (cancelled) return;
          if (error) {
            setFailed(true);
          } else {
            router.replace(destination);
          }
          return;
        }
      }

      // Forward-compatible fallback: if templates ever get customized to
      // use {{ .TokenHash }}, this handles that pattern too.
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (cancelled) return;
        if (error) {
          setFailed(true);
        } else {
          router.replace(destination);
        }
        return;
      }

      if (!cancelled) setFailed(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (failed) {
      router.replace("/parent?error=confirm-link-invalid");
    }
  }, [failed, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-calm-text/70">Confirming…</p>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
