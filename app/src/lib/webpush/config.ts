// The VAPID public key identifies this app to the push service and is
// safe to expose client-side (it's handed to PushManager.subscribe as the
// applicationServerKey) — same "safe to expose, real protection is
// server-side" reasoning as src/lib/supabase/config.ts. The default below
// is this project's actual key so subscribing works even before the
// Vercel env var is set; override with NEXT_PUBLIC_VAPID_PUBLIC_KEY if the
// key pair is ever rotated.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BAtzSMB3MpIN-_8XycSmgRdETsxamcCTyQUhVJDXxZdYu9_MCLKKfe4LIO-_pw9yT7tHD9fkpzjGL2RzKSM4od0";

// Unlike the public key, the private key is a real secret — it must come
// from the VAPID_PRIVATE_KEY Vercel env var with no fallback. If it's
// unset, src/lib/webpush/send.ts skips sending pushes entirely (in-app
// notifications still work) rather than throwing.
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:ajaxus@gmail.com";
