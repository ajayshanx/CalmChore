export type RedemptionCategory = "grocery" | "purchases" | "eating_out" | "screen_time" | "cash" | "other";

export const REDEMPTION_CATEGORIES: RedemptionCategory[] = [
  "grocery",
  "purchases",
  "eating_out",
  "screen_time",
  "cash",
  "other",
];

export const CATEGORY_LABELS: Record<RedemptionCategory, string> = {
  grocery: "Grocery Treats",
  purchases: "Purchases",
  eating_out: "Eating Out",
  screen_time: "Screen Time",
  cash: "Cash / Pocket Money",
  other: "Other",
};

export const CATEGORY_ICONS: Record<RedemptionCategory, string> = {
  grocery: "🍬",
  purchases: "🛍️",
  eating_out: "🍽️",
  screen_time: "📱",
  cash: "💵",
  other: "✨",
};

export const SCREEN_TIME_INTERVALS = ["30min", "45min", "1 hr", "1.5 hrs", "2 hrs", "Movie"];

export type RequestDetails = {
  whatWouldYouLike?: string;
  restaurantCuisine?: string;
  interval?: string;
  purpose?: string;
  amount?: string;
};

// Renders the free-form "Requested for" text shown in every grid (child and
// parent side), from whichever fields that category actually collected.
export function formatRequestDetails(category: string, details: RequestDetails | null | undefined): string {
  const d = details ?? {};
  switch (category) {
    case "grocery":
    case "purchases":
    case "other":
      return d.whatWouldYouLike || "—";
    case "eating_out":
      return d.restaurantCuisine || "—";
    case "screen_time":
      return [d.interval, d.purpose].filter(Boolean).join(" · ") || "—";
    case "cash":
      return d.amount || "—";
    default:
      return "—";
  }
}
