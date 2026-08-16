"use client";

import { useState } from "react";
import { tierChipClass, type TierStatus } from "@/lib/tiers";
import RequestFreezeForm from "./RequestFreezeForm";
import CancelFreezeButton from "./CancelFreezeButton";
import TierShield from "@/components/icons/TierShield";

export type LedgerRow = {
  id: string;
  delta: number;
  type: string;
  description: string | null;
  createdAt: string;
};

export type FreezeRow = {
  id: string;
  freezeFrom: string;
  freezeTo: string;
  reason: string | null;
  status: string;
};

const TYPE_LABELS: Record<string, string> = {
  chore_award: "Chore",
  weekly_streak_bonus: "Weekly Streak Bonus",
  redemption_debit: "Redemption",
  manual_adjustment: "Adjustment",
};

const FREEZE_STATUS_LABELS: Record<string, string> = {
  auto_applied: "Auto-Applied",
  approved: "Approved",
  pending: "Pending",
  declined: "Declined",
};

const FREEZE_STATUS_CLASSES: Record<string, string> = {
  auto_applied: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  declined: "bg-red-100 text-red-800",
};

function formatFreezeDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

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
  freezes,
  freezesRemaining,
  freezeCap,
}: {
  totalCompleted: number;
  totalOngoing: number;
  totalPoints: number;
  tier: TierStatus;
  ledger: LedgerRow[];
  freezes: FreezeRow[];
  freezesRemaining: number;
  freezeCap: number;
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
        <div className="flex flex-col gap-4">
          <div className={`rounded-xl px-5 py-4 ${tierChipClass(tier.tierName)}`}>
            <p className="text-lg font-semibold">
              ❄️ {freezesRemaining} of {freezeCap} freeze{freezeCap === 1 ? "" : "s"} left this
              week
            </p>
            <p className="mt-1 text-sm opacity-80">
              Resets Monday. Counts both auto-applied freezes and any multi-day freeze a parent
              has approved.
            </p>
          </div>

          <p className="text-sm text-calm-text/60">
            A freeze protects your streak on a day you couldn&apos;t get to your chores. One is
            used automatically when a day is missed, if your tier still has one free for the
            week — otherwise your streak resets. You can also ask a parent for a multi-day
            freeze ahead of time.
          </p>

          <RequestFreezeForm />

          {freezes.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {freezes.map((freeze) => (
                <li
                  key={freeze.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatFreezeDate(freeze.freezeFrom)}
                      {freeze.freezeFrom !== freeze.freezeTo ? ` – ${formatFreezeDate(freeze.freezeTo)}` : ""}
                    </p>
                    {freeze.reason && (
                      <p className="truncate text-xs text-calm-text/50">{freeze.reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        FREEZE_STATUS_CLASSES[freeze.status] ?? "bg-calm-bg text-calm-text/60"
                      }`}
                    >
                      {FREEZE_STATUS_LABELS[freeze.status] ?? freeze.status}
                    </span>
                    {freeze.status === "pending" && <CancelFreezeButton freezeId={freeze.id} />}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">No freezes yet.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Completed" value={totalCompleted} />
            <StatCard label="Ongoing" value={totalOngoing} />
            <StatCard label="Points" value={totalPoints} />
            <StatCard label="Streak" value={tier.streakDays} />
          </div>

          <div className={`flex items-center gap-4 rounded-xl px-5 py-4 ${tierChipClass(tier.tierName)}`}>
            <TierShield tierName={tier.tierName} level={tier.level} weapon={tier.weapon} size={40} />
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
              <div className="overflow-x-auto rounded-lg border border-calm-green/15 bg-white">
                <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-calm-green/15 bg-calm-bg text-calm-text/60">
                      <th className="whitespace-nowrap px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row) => (
                      <tr key={row.id} className="border-b border-calm-green/10 last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-2 text-calm-text/60">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{row.description || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-calm-text/60">
                          {TYPE_LABELS[row.type] ?? row.type}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${
                            row.delta >= 0 ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {row.delta >= 0 ? "+" : ""}
                          {row.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-calm-text/60">No points activity yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
