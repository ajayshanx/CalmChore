// Tier / level system from "Child Login Options.txt" — driven entirely by
// child_streaks.current_streak_days (consecutive days with a validated
// chore). Rook is an 8-value band (day 0 through day 7, day 0 covering a
// brand-new streak that hasn't completed its first day yet); every tier
// after that is a clean 7-value band, exactly as spec'd:
//   Rook 0-7, Warrior 8-14, Hero 15-21, Champion 22-28, Icon 29-35,
//   Legend 36-42, Master 43-49, Sovereign 50-56, Titan 57-63, Oracle 64-70,
//   Avatar 71-77, Demigod 78+.
// Levels split each tier into first-3-days / next-2-days / next-2-days
// (Rook's extra day 0 folds into Level 1, giving it 4/2/2 instead of 3/2/2 —
// the only place the boundaries deviate from the other 11 tiers).

export type TierDef = {
  name: string;
  start: number;
  end: number; // Infinity for the open-ended top tier
  weapon: string;
};

export const TIERS: TierDef[] = [
  { name: "Rook", start: 0, end: 7, weapon: "Wooden Spoon" },
  { name: "Warrior", start: 8, end: 14, weapon: "Fork" },
  { name: "Hero", start: 15, end: 21, weapon: "Club" },
  { name: "Champion", start: 22, end: 28, weapon: "Knife" },
  { name: "Icon", start: 29, end: 35, weapon: "Sword" },
  { name: "Legend", start: 36, end: 42, weapon: "Axe" },
  { name: "Master", start: 43, end: 49, weapon: "Morningstar" },
  { name: "Sovereign", start: 50, end: 56, weapon: "Flail" },
  { name: "Titan", start: 57, end: 63, weapon: "Lance" },
  { name: "Oracle", start: 64, end: 70, weapon: "Spear" },
  { name: "Avatar", start: 71, end: 77, weapon: "Longsword" },
  { name: "Demigod", start: 78, end: Infinity, weapon: "Warhammer" },
];

// Progressively "more royal" flat colour per tier, reusing the app's
// existing Tailwind-JIT-safe literal-class pattern (see calendarColours.ts)
// rather than interpolating a colour name into a class string.
const TIER_STYLE: Record<string, string> = {
  Rook: "bg-stone-100 text-stone-700 border border-stone-300",
  Warrior: "bg-orange-100 text-orange-800 border border-orange-300",
  Hero: "bg-amber-100 text-amber-800 border border-amber-300",
  Champion: "bg-lime-100 text-lime-800 border border-lime-300",
  Icon: "bg-teal-100 text-teal-800 border border-teal-300",
  Legend: "bg-sky-100 text-sky-800 border border-sky-300",
  Master: "bg-blue-100 text-blue-800 border border-blue-300",
  Sovereign: "bg-indigo-100 text-indigo-800 border border-indigo-300",
  Titan: "bg-violet-100 text-violet-800 border border-violet-300",
  Oracle: "bg-purple-100 text-purple-800 border border-purple-300",
  Avatar: "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300",
  Demigod: "bg-yellow-100 text-yellow-800 border border-yellow-400",
};

export function tierChipClass(tierName: string): string {
  return TIER_STYLE[tierName] ?? TIER_STYLE.Rook;
}

export type TierStatus = {
  tierName: string;
  level: 1 | 2 | 3;
  weapon: string;
  streakDays: number;
  nextTierName: string | null;
  daysToNextTier: number | null;
};

export function getTierStatus(streakDays: number): TierStatus {
  const d = Math.max(0, streakDays);
  const tierIndex = TIERS.findIndex((t) => d <= t.end);
  const tier = tierIndex === -1 ? TIERS[TIERS.length - 1] : TIERS[tierIndex];

  const pos = d - tier.start;
  // Rook's band is one day wider than the rest (0-7 vs a normal 7-value
  // band), so its Level 1 absorbs that extra day (0-3 instead of 0-2).
  const isRook = tier.name === "Rook";
  const level: 1 | 2 | 3 = isRook
    ? pos <= 3
      ? 1
      : pos <= 5
        ? 2
        : 3
    : pos <= 2
      ? 1
      : pos <= 4
        ? 2
        : 3;

  const nextTier = tierIndex >= 0 && tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;

  return {
    tierName: tier.name,
    level,
    weapon: tier.weapon,
    streakDays: d,
    nextTierName: nextTier?.name ?? null,
    daysToNextTier: nextTier ? Math.max(0, nextTier.start - d) : null,
  };
}
