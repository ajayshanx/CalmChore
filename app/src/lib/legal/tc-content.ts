// Plain-language rendering of "Calm Chore Terms and Conditions.docx".
// Keep this in sync with that document — it is the source of truth for
// exact legal wording. CONSENT_VERSION must bump whenever a change here
// is material (changes what's collected/used/shared), which re-triggers
// acceptance for all parents per "Calm Chore Setup.txt" -> Create Account.
export const CONSENT_VERSION = "v1.0";

export const TC_SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Why You're Seeing This",
    body: [
      "Calm Chore is an app that helps your family track chores, points, and rewards for your kids. Because children under 13 may use this app, U.S. federal law (COPPA) requires us to tell you exactly what information we collect from your child, how we use it, and to get your consent before we do — and to give you an easy way to review, change, or delete it later.",
      "Only a parent or legal guardian can create a child's profile — children cannot sign themselves up. By accepting this notice, you're confirming you are that child's parent or legal guardian and that you consent on their behalf.",
      "This isn't a one-time notice — the same text stays available afterward under Setup → Privacy Policy, along with a summary of the two things parents ask about most: automatic proof photo deletion, and that we never collect a child's real name.",
    ],
  },
  {
    heading: "2. Information We Collect",
    body: [
      "About you (the parent): first name, last name, and email address.",
      "About your child: we do not collect your child's real/legal name at all — there is no such field anywhere in Calm Chore. Instead: a parent-created username and passcode (used only so your child can log in), and a nickname your child picks, which is the only identifier shown anywhere in the app, including to friends. A chosen accent colour is also collected.",
      "Proof photos: collected only to support your review of a submitted chore, and automatically and permanently deleted the moment you mark that chore Complete, Partially Complete, or Incomplete. Never retained afterward or shown to anyone else.",
    ],
  },
  {
    heading: "3. How We Use This Information",
    body: [
      "To run the app's core features: chores, points, streaks, tiers, and redemption requests.",
      "To let your child connect with friends, only after the other family's parent approves the connection.",
      "We do not use your child's information for advertising and never build advertising profiles.",
    ],
  },
  {
    heading: "4. Sharing",
    body: [
      "We do not sell your child's personal information or share it with third parties for marketing.",
      "Through Friends: limited to nickname, streak, points, tier, and last 5 completed chore names/dates/points — never proof photos, passcodes, or full history.",
      "With our infrastructure providers (Supabase for the database, Vercel for hosting), solely to run the app on our behalf.",
    ],
  },
  {
    heading: "5. Your Rights As A Parent",
    body: [
      "Review, correct, or delete your child's information at any time.",
      "Refuse further collection by pausing or deleting your child's profile.",
      "Revoke consent at any time — this deletes your child's information and ends their access, since the app can't function without it.",
    ],
  },
  {
    heading: "6. Your Consent",
    body: [
      "Checking the box below and selecting \"I Agree\" is what we rely on as your consent record, tied to your own account — modeled on the traditional signed-consent-form approach, rather than a separate follow-up email step. We record the date and time of your first acceptance, visible afterward under Setup → Privacy Policy along with the version you accepted.",
    ],
  },
];

export const CONSENT_CHECKBOX_TEXT =
  "I am the parent or legal guardian of the child/children I add to this account. I have read this Terms & Conditions and Parental Consent Notice, and I consent to Calm Chore collecting and using my child's information as described above. I understand I can review, change, or delete this information, or revoke my consent, at any time.";
