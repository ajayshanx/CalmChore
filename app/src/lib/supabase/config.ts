// The Supabase URL and anon/publishable key are safe to expose in client code
// by design — they're meant to be public, and all real protection comes from
// Row Level Security policies on the database. Defaults below match the
// CalmChore Supabase project so the app works even before Vercel env vars
// are configured; env vars (if set) still take priority.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wiexbxiywecrtqxjcjff.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_5clwAwf7HD6ibxeBAcx57Q_wB8U0Wyq";

// Used to build absolute links (e.g. the email confirmation callback) that
// must work from a server action, where there's no browser `location` to
// read. Override with NEXT_PUBLIC_SITE_URL if the production domain changes.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://calm-chore.vercel.app";
