"use client";

import { useMemo, useState } from "react";
import { pillClass } from "@/lib/chores/calendarColours";
import { tierChipClass, type TierStatus } from "@/lib/tiers";
import { weekRange, monthRange } from "@/lib/chores/calendarDates";
import MarkDoneCard from "./MarkDoneCard";
import ApplyFreezeForm from "./ApplyFreezeForm";
import AdjustPointsForm from "./AdjustPointsForm";

export type ManagedChild = { id: string; label: string; colour: string };

export type ManageChoreRow = {
  instanceId: string;
  assignmentId: string | null;
  choreId: string;
  choreName: string;
  choreInfo: string | null;
  date: string;
  time: string | null;
  deadlineAt: string | null;
  points: number;
  status: string | null;
  requiresProof: boolean;
  assignmentType: string;
};

type LedgerRow = { id: string; delta: number; type: string; description: string | null; createdAt: string };
type FreezeRow = { id: string; freezeFrom: string; freezeTo: string; reason: string | null; status: string };

export type ManageChildData = {
  totalPoints: number;
  tier: TierStatus;
  ledger: LedgerRow[];
  freezes: FreezeRow[];
};

const ONGOING_STATUSES = [null, "assigned", "accepted", "incomplete"];

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

type RangeFilter = "today" | "week" | "month" | "all";
const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All" },
];

function withinRange(dateStr: string, range: RangeFilter, today: string): boolean {
  if (range === "all") return true;
  if (range === "today") return dateStr === today;
  if (range === "week") {
    const [start, end] = weekRange(today);
    return dateStr >= start && dateStr <= end;
  }
  const [start, end] = monthRange(today);
  return dateStr >= start && dateStr <= end;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-calm-green/20 bg-white px-3 py-3 text-center">
      <p className="text-xl font-semibold text-calm-green">{value}</p>
      <p className="text-xs text-calm-text/50">{label}</p>
    </div>
  );
}

export default function ManageView({
  managedChildren,
  choresByChild,
  childData,
  today,
}: {
  managedChildren: ManagedChild[];
  choresByChild: Record<string, ManageChoreRow[]>;
  childData: Record<string, ManageChildData>;
  today: string;
}) {
  const [selectedChildId, setSelectedChildId] = useState(managedChildren[0].id);
  const [tab, setTab] = useState<"chores" | "points" | "freezes">("chores");
  const [range, setRange] = useState<RangeFilter>("week");

  const chores = choresByChild[selectedChildId] ?? [];
  const data = childData[selectedChildId];

  const visibleChores = useMemo(() => {
    return chores
      .filter((c) => ONGOING_STATUSES.includes(c.status) && withinRange(c.date, range, today))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [chores, range, today]);

  return (
    <div className="flex flex-col gap-6">
      {managedChildren.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {managedChildren.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                selectedChildId === c.id
                  ? "border-calm-green bg-calm-greenLight text-calm-green"
                  : `border-calm-green/20 ${pillClass(c.colour)}`
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 border-b border-calm-green/15">
        {(["chores", "points", "freezes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
            }`}
          >
            {t === "chores" ? "Chores" : t === "points" ? "Points" : "Chore Freezes"}
          </button>
        ))}
      </div>

      {tab === "chores" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1 rounded-lg border border-calm-green/20 p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-md px-3 py-1 text-sm ${
                  range === opt.key ? "bg-calm-green text-white" : "text-calm-green"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {visibleChores.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {visibleChores.map((chore) => (
                <MarkDoneCard key={`${chore.instanceId}-${chore.assignmentId}`} chore={chore} childId={selectedChildId} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">
              No chores assigned to or open for this child
              {range !== "all" ? ` for ${RANGE_OPTIONS.find((o) => o.key === range)?.label.toLowerCase()}` : ""}.
            </p>
          )}
        </div>
      )}

      {tab === "points" && data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard label="Points" value={data.totalPoints} />
            <StatCard label="Streak" value={data.tier.streakDays} />
            <StatCard label="Level" value={data.tier.level} />
          </div>

          <div className={`flex items-center gap-4 rounded-xl px-5 py-4 ${tierChipClass(data.tier.tierName)}`}>
            <span className="text-3xl leading-none">🛡️</span>
            <div>
              <p className="text-lg font-semibold">
                {data.tier.tierName} · Level {data.tier.level}
              </p>
              <p className="text-sm opacity-80">Weapon: {data.tier.weapon}</p>
              <p className="mt-1 text-xs opacity-70">
                {data.tier.nextTierName
                  ? `${data.tier.daysToNextTier} day${data.tier.daysToNextTier === 1 ? "" : "s"} to ${data.tier.nextTierName}`
                  : "Top tier reached!"}
              </p>
            </div>
          </div>

          <AdjustPointsForm childId={selectedChildId} />

          <div>
            <p className="mb-2 text-sm font-medium text-calm-text/70">Points History</p>
            {data.ledger.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {data.ledger.map((row) => (
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

      {tab === "freezes" && data && (
        <div className="flex flex-col gap-4">
          <ApplyFreezeForm childId={selectedChildId} />
          {data.freezes.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {data.freezes.map((freeze) => (
                <li
                  key={freeze.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {freeze.freezeFrom}
                      {freeze.freezeFrom !== freeze.freezeTo ? ` – ${freeze.freezeTo}` : ""}
                    </p>
                    {freeze.reason && <p className="truncate text-xs text-calm-text/50">{freeze.reason}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      FREEZE_STATUS_CLASSES[freeze.status] ?? "bg-calm-bg text-calm-text/60"
                    }`}
                  >
                    {FREEZE_STATUS_LABELS[freeze.status] ?? freeze.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">No freezes yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
