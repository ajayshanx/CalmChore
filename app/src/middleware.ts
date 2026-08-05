import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

// Without this middleware, a parent's Supabase session (access token) is
// only ever refreshed inside Server Actions — Server Components are not
// allowed to write cookies, so `src/lib/supabase/server.ts`'s `setAll`
// silently drops any refreshed token it gets handed. Once the original
// access token expires (~1hr by default), every page read after that
// point runs with an invalid/absent `auth.uid()`, which makes every RLS
// policy in this app (`... = current_family_id()`) evaluate to false —
// so pages like Validate and the Calendar render successfully but with
// zero rows, instead of erroring. Middleware is the one place allowed to
// rewrite the response's cookies on every request, so it's the only
// reliable place to keep the session alive across a long day of use.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touching getUser() is what triggers the refresh (if the access token
  // is expired/near-expiry) and, via setAll above, persists the new
  // tokens back onto the response cookies the browser will store.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, so any parent route can pick
    // up a refreshed session — child routes use their own cookie-based
    // session (see lib/childSession.ts) and are unaffected by this.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)",
  ],
};
