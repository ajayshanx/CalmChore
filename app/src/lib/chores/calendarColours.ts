// Static (non-interpolated, Tailwind-JIT-safe) class lookups for calendar
// pills, keyed by the same accent_colour values used for child profiles.
// Unassigned instances use a neutral grey, per "Chore Calendar" ->
// "Unassigned chores should be indicated in a neutral colour".
export const PILL_CLASS_BY_COLOUR: Record<string, string> = {
  blue: "bg-child-blueBg text-calm-text border border-child-blueAccent",
  red: "bg-child-redBg text-calm-text border border-child-redAccent",
  purple: "bg-child-purpleBg text-calm-text border border-child-purpleAccent",
  orange: "bg-child-orangeBg text-calm-text border border-child-orangeAccent",
  gold: "bg-child-goldBg text-calm-text border border-child-goldAccent",
  teal: "bg-child-tealBg text-calm-text border border-child-tealAccent",
  neutral: "bg-calm-bg text-calm-text/70 border border-calm-text/20",
};

export function pillClass(colour: string | null | undefined): string {
  return PILL_CLASS_BY_COLOUR[colour ?? "neutral"] ?? PILL_CLASS_BY_COLOUR.neutral;
}
