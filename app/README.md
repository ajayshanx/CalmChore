# Calm Chore

Next.js (App Router) + Supabase app implementing the Calm Chore product spec.

## Status

First vertical slice: landing page, parent Create Account with in-app Terms &
Conditions / consent capture, parent login, and a placeholder dashboard. Everything
else in the spec (chores, calendar, points/streaks/tiers, freezes, breaks,
redemption, friends, child login, cron jobs) is not built yet — see the PRD and
spec `.txt` files in the parent folder for the full picture.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` if you want to override the Supabase
connection (the public URL/anon key already have safe defaults baked in).

## Architecture notes

- **Parents** authenticate via Supabase Auth (email + password); Row Level
  Security policies scope all family data by `family_id`.
- **Children** authenticate via username + 6-digit passcode, *not* Supabase
  Auth — there's no `auth.uid()` for RLS to key off for them. Child-facing
  server routes instead use the service-role client
  (`src/lib/supabase/service.ts`) and enforce authorization in application
  code against a signed session issued at child login (not yet built).
- The family's **timezone of record** is captured from the browser at parent
  Create Account and stored on `families.timezone` — all "day"/"week"
  boundary logic (streaks, freezes, the Weekly Streak Bonus) should use it,
  not server or device local time.
- Proof photos are deleted the moment a parent sets a chore outcome — no
  storage bucket/photo upload is wired up yet in this slice.
