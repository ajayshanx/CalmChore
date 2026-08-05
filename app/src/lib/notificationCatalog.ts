// Pure constants — no "server-only" import here, since this needs to be
// importable from client components (e.g. the Setup > Notifications
// preferences form) as well as server actions. Server-only notification
// *sending* logic lives in "@/lib/notifications" instead.

// The 12 actions from "Calm Chore Setup.txt" -> Setup --> Notifications.
// "chore_value_update" and "chore_deadline_update" aren't wired to a live
// trigger yet since chore editing doesn't exist in the app yet — they're
// still listed here (and configurable) so the settings screen matches spec,
// ready to fire once chore editing is built. Same for "friend_addition"
// until the Friends feature exists.
export type NotificationAction =
  | "parent_addition"
  | "child_addition"
  | "chore_addition"
  | "chore_assignment"
  | "chore_value_update"
  | "chore_deadline_update"
  | "chore_acceptance"
  | "chore_completion"
  | "chore_assessment"
  | "point_awarding"
  | "point_redemption"
  | "friend_addition"
  // Beyond the original 12 from spec — a recurring chore's generated
  // schedule (bounded by an end date/count, or the system's generation
  // safety cap) is about to run out, so the parent can extend it before a
  // gap opens up. See lib/chores/scheduleLowCheck.ts.
  | "chore_schedule_low"
  // A child's login was locked after repeated failed passcode attempts —
  // could be the child fumbling their own passcode, or someone else
  // guessing at it. See child/actions.ts loginChild.
  | "child_login_locked";

export const NOTIFICATION_ACTIONS: NotificationAction[] = [
  "parent_addition",
  "child_addition",
  "chore_addition",
  "chore_assignment",
  "chore_value_update",
  "chore_deadline_update",
  "chore_acceptance",
  "chore_completion",
  "chore_assessment",
  "point_awarding",
  "point_redemption",
  "friend_addition",
  "chore_schedule_low",
  "child_login_locked",
];

export const ACTION_LABELS: Record<NotificationAction, string> = {
  parent_addition: "Parent addition",
  child_addition: "Child addition",
  chore_addition: "Chore addition",
  chore_assignment: "Chore assignment",
  chore_value_update: "Chore value additions / updates",
  chore_deadline_update: "Chore deadline addition / update",
  chore_acceptance: "Chore acceptance",
  chore_completion: "Chore completion",
  chore_assessment: "Chore assessment",
  point_awarding: "Point awarding",
  point_redemption: "Point redemption",
  friend_addition: "Friend addition",
  chore_schedule_low: "Recurring chore schedule running low",
  child_login_locked: "Child login locked (too many failed attempts)",
};
