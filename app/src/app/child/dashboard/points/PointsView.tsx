"use client";

import { useState } from "react";
import { tierChipClass, type TierStatus } from "@/lib/tiers";

export type LedgerRow = {
  id: string;
  delta: number;
  type: string;
  description: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  chore_award: "Chore",
  weekly_streak_bonus: "Weekly Streak Bonus",
  redemption_debit: "Redemption",
  manual_adjustment: "Adjustment",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-calm-green/20 bg-white px-3 py-3 text-center">
      <p className="text-xl font-semibold text-calm-green">{value}</p>
      <p className="text-xs text-calm-text/50">{label}</p>
    </div>
  );
}

export default function PointsView({
  totalCompleted,
  totalOngoing,
  totalPoints,
  tier,
  ledger,
}: {
  totalCompleted: number;
  totalOngoing: number;
  totalPoints: number;
  tier: TierStatus;
  ledger: LedgerRow[];
}) {
  const [tab, setTab] = useState<"points" | "freezes">("points");

  return (
    <div>
      <div className="mb-4 flex gap-4 border-b border-calm-green/15">
        {(["points", "freezes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
            }`}
          >
            {t === "points" ? "Points" : "Chore Freezes"}
          </button>
        ))}
      </div>

      {tab === "freezes" ? (
        <p className="text-sm text-calm-text/60">
          Chore Freezes are coming soon — this is where automatic and requested freezes will show up.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Completed" value={totalCompleted} />
            <StatCard label="Ongoing" value={totalOngoing} />
            <StatCard label="Points" value={totalPoints} />
            <StatCard label="Streak" value={tier.streakDays} />
          </div>

          <div className={`flex items-center gap-4 rounded-xl px-5 py-4 ${tierChipClass(tier.tierName)}`}>
            <span className="text-3xl leading-none">🛡️</span>
            <div>
              <p className="text-lg font-semibold">
                {tier.tierName} · Level {tier.level}
              </p>
              <p className="text-sm opacity-80">Weapon: {tier.weapon}</p>
              <p className="mt-1 text-xs opacity-70">
                {tier.nextTierName
                  ? `${tier.daysToNextTier} day${tier.daysToNextTier === 1 ? "" : "s"} to ${tier.nextTierName}`
                  : "Top tier reached!"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-calm-text/70">Points History</p>
            {ledger.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {ledger.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{row.description || TYPE_LABELS[row.type] || row.type}</p>
                      <p className="text-xs text-calm-text/50">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-semibold ${row.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {row.delta >= 0 ? "+" : ""}
                      {row.delta}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-calm-text/60">No points activity yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
