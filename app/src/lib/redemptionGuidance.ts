import type { RedemptionCategory } from "./redemption";

// Redemption pacing guidance — not in the original 4 spec files, added per
// product discussion: parents set points-per-chore themselves, so a fixed
// point number ("costs 50 points") wouldn't mean the same thing across
// families. Guidance is purely informational everywhere it's shown — it
// never blocks a child from submitting a request or a parent from approving
// one; it just gives both sides the same numbers to reason with.
//
// The point range is based on what this child has actually redeemed for
// similar things before (real precedent), not on how fast they're currently
// earning — an earlier version scaled the range off recent earning pace,
// which meant a kid doing more chores got told treats "usually cost" more
// points, a backwards incentive flagged during product review. Earning pace
// is now only used as a one-time cold-start estimate, before any redemption
// history exists for that tier — once a child has redeemed anything in a
// tier, the guidance is driven entirely by that history and no longer moves
// just because they did more chores.

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
  // "history" = pointRange reflects what this child actually redeemed for
  // similar things before (real precedent, doesn't move with earning pace).
  // "estimate" = cold-start fallback, used only when no redemption history
  // exists yet for this tier.
  basis: "history" | "estimate";
  daysSinceLast: number | null;
};

// Points actually spent on past *approved* redemptions, grouped by tier —
// the real precedent that now drives the guidance range. Only approved
// requests count (pending/rejected ones don't reflect an agreed price).
export function pastPointsUsedByTier(
  requests: { category: string; status: string; pointsUsed: number | null }[]
): Record<RedemptionTier, number[]> {
  const result: Record<RedemptionTier, number[]> = { everyday: [], outing: [], big: [] };
  for (const r of requests) {
    if (r.status !== "approved" || r.pointsUsed == null) continue;
    const tier = CATEGORY_TIER[r.category as RedemptionCategory];
    if (!tier) continue;
    result[tier].push(r.pointsUsed);
  }
  return result;
}

export function getRedemptionGuidance(
  category: RedemptionCategory,
  avgPtsPerDay: number,
  lastByTier: Record<RedemptionTier, string | null>,
  pastPointsByTier: Record<RedemptionTier, number[]>,
  today: string
): RedemptionGuidance {
  const tier = CATEGORY_TIER[category];
  const info = TIER_INFO[tier];
  const lastRedeemedAt = lastByTier[tier];
  const pastValues = pastPointsByTier[tier] ?? [];

  let pointRange: [number, number] | null = null;
  let basis: "history" | "estimate" = "estimate";

  if (pastValues.length > 0) {
    basis = "history";
    const min = Math.min(...pastValues);
    const max = Math.max(...pastValues);
    pointRange = [min, max];
  } else if (info.minDaysWorth != null && info.maxDaysWorth != null && avgPtsPerDay > 0) {
    pointRange = [
      Math.max(1, Math.round(info.minDaysWorth * avgPtsPerDay)),
      Math.max(1, Math.round(info.maxDaysWorth * avgPtsPerDay)),
    ];
  }

  const daysSinceLast = lastRedeemedAt
    ? Math.max(
        0,
        Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(lastRedeemedAt).getTime()) / 86400000)
      )
    : null;

  return { tier, cadenceLabel: info.cadenceLabel, pointRange, basis, daysSinceLast };
}

function recencyPhrase(daysSinceLast: number): string {
  return daysSinceLast === 0 ? "today" : `${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago`;
}

function formatPointRange(range: [number, number]): string {
  return range[0] === range[1] ? `about ${range[0]} points` : `about ${range[0]}–${range[1]} points`;
}

// Child-facing: second person, casual.
export function formatGuidanceForChild(guidance: RedemptionGuidance): string {
  const costPart = guidance.pointRange
    ? `usually costs ${formatPointRange(guidance.pointRange)}`
    : "tends to be a bigger ask";
  let text = `This kind of request ${costPart} and comes up ${guidance.cadenceLabel}.`;
  if (guidance.pointRange && guidance.basis === "estimate") {
    text += " (Just a starting estimate — you haven't redeemed this kind of thing before.)";
  }
  if (guidance.daysSinceLast != null) {
    text += ` You last redeemed this kind of thing ${recencyPhrase(guidance.daysSinceLast)}.`;
  }
  return text;
}

// Parent-facing: names the child, shown in the approval card.
export function formatGuidanceForParent(childLabel: string, guidance: RedemptionGuidance): string {
  const costPart = guidance.pointRange
    ? `usually costs ${formatPointRange(guidance.pointRange)}`
    : "tends to be a bigger ask";
  let text = `${childLabel}'s requests like this ${costPart} and come up ${guidance.cadenceLabel}.`;
  if (guidance.pointRange && guidance.basis === "estimate") {
    text += " (Starting estimate — no past redemptions in this category yet.)";
  }
  if (guidance.daysSinceLast != null) {
    text += ` Last approved ${recencyPhrase(guidance.daysSinceLast)}.`;
  }
  return text;
}
