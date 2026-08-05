import type { RedemptionCategory } from "./redemption";

// Redemption pacing guidance — not in the original 4 spec files, added per
// product discussion: parents set points-per-chore themselves, so a fixed
// point number ("costs 50 points") wouldn't mean the same thing across
// families, or even across the same child's account as chore values change.
// Guidance is instead expressed relative to the child's own recent earning
// rate, and is purely informational everywhere it's shown — it never blocks
// a child from submitting a request or a parent from approving one; it just
// gives both sides the same numbers to reason with.

export type RedemptionTier = "everyday" | "outing" | "big";

// Groups the 6 redemption categories into 3 pacing tiers. Screen Time is
// grouped with Grocery/Purchases as an "everyday" treat (rather than its
// own even-more-frequent tier), and "Other" is grouped with Cash/Pocket
// Money as a "big ask" (rather than left unguided) — both per product
// discussion.
export const CATEGORY_TIER: Record<RedemptionCategory, RedemptionTier> = {
  grocery: "everyday",
  purchases: "everyday",
  screen_time: "everyday",
  eating_out: "outing",
  cash: "big",
  other: "big",
};

type TierInfo = {
  cadenceLabel: string;
  // Point-cost range expressed as a multiple of the child's average
  // points/day. Null for "big" asks — deliberately left open-ended rather
  // than implying a ceiling on bigger requests.
  minDaysWorth: number | null;
  maxDaysWorth: number | null;
};

const TIER_INFO: Record<RedemptionTier, TierInfo> = {
  everyday: { cadenceLabel: "about once a week", minDaysWorth: 3, maxDaysWorth: 3.5 },
  outing: { cadenceLabel: "about once every two weeks", minDaysWorth: 0, maxDaysWorth: 7 },
  big: { cadenceLabel: "about once a month", minDaysWorth: null, maxDaysWorth: null },
};

const EARN_RATE_WINDOW_DAYS = 14;

// Average points *earned* per day over the trailing window — deliberately
// only chore_award + weekly_streak_bonus (excludes redemption_debit and
// manual_adjustment, neither of which reflects chore-earning pace).
export function averagePointsPerDay(
  ledger: { delta: number; type: string; createdAt: string }[],
  today: string,
  windowDays: number = EARN_RATE_WINDOW_DAYS
): number {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);

  const total = ledger
    .filter(
      (row) =>
        (row.type === "chore_award" || row.type === "weekly_streak_bonus") &&
        new Date(row.createdAt) >= cutoff
    )
    .reduce((sum, row) => sum + row.delta, 0);

  return total / windowDays;
}

// Most recent *approved* redemption per tier — pacing is about the tier as
// a whole (a Grocery Treat and a Screen Time redemption both count against
// "everyday" pacing), not each of the 6 categories in isolation.
export function lastRedeemedByTier(
  requests: { category: string; status: string; decidedAt: string | null; createdAt: string }[]
): Record<RedemptionTier, string | null> {
  const result: Record<RedemptionTier, string | null> = { everyday: null, outing: null, big: null };
  for (const r of requests) {
    if (r.status !== "approved") continue;
    const tier = CATEGORY_TIER[r.category as RedemptionCategory];
    if (!tier) continue;
    const at = r.decidedAt ?? r.createdAt;
    if (!result[tier] || new Date(at) > new Date(result[tier] as string)) {
      result[tier] = at;
    }
  }
  return result;
}

export type RedemptionGuidance = {
  tier: RedemptionTier;
  cadenceLabel: string;
  pointRange: [number, number] | null;
  daysSinceLast: number | null;
};

export function getRedemptionGuidance(
  category: RedemptionCategory,
  avgPtsPerDay: number,
  lastByTier: Record<RedemptionTier, string | null>,
  today: string
): RedemptionGuidance {
  const tier = CATEGORY_TIER[category];
  const info = TIER_INFO[tier];
  const lastRedeemedAt = lastByTier[tier];

  const pointRange: [number, number] | null =
    info.minDaysWorth != null && info.maxDaysWorth != null && avgPtsPerDay > 0
      ? [
          Math.max(1, Math.round(info.minDaysWorth * avgPtsPerDay)),
          Math.max(1, Math.round(info.maxDaysWorth * avgPtsPerDay)),
        ]
      : null;

  const daysSinceLast = lastRedeemedAt
    ? Math.max(
        0,
        Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(lastRedeemedAt).getTime()) / 86400000)
      )
    : null;

  return { tier, cadenceLabel: info.cadenceLabel, pointRange, daysSinceLast };
}

function recencyPhrase(daysSinceLast: number): string {
  return daysSinceLast === 0 ? "today" : `${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago`;
}

// Child-facing: second person, casual.
export function formatGuidanceForChild(guidance: RedemptionGuidance): string {
  const costPart = guidance.pointRange
    ? `usually costs about ${guidance.pointRange[0]}–${guidance.pointRange[1]} points`
    : "tends to be a bigger ask";
  let text = `This kind of request ${costPart} and comes up ${guidance.cadenceLabel}.`;
  if (guidance.daysSinceLast != null) {
    text += ` You last redeemed this kind of thing ${recencyPhrase(guidance.daysSinceLast)}.`;
  }
  return text;
}

// Parent-facing: names the child, shown in the approval card.
export function formatGuidanceForParent(childLabel: string, guidance: RedemptionGuidance): string {
  const costPart = guidance.pointRange
    ? `usually costs about ${guidance.pointRange[0]}–${guidance.pointRange[1]} points`
    : "tends to be a bigger ask";
  let text = `${childLabel}'s requests like this ${costPart} and come up ${guidance.cadenceLabel}.`;
  if (guidance.daysSinceLast != null) {
    text += ` Last approved ${recencyPhrase(guidance.daysSinceLast)}.`;
  }
  return text;
}
