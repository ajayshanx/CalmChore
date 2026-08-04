"use client";

import { useMemo, useState } from "react";
import ChoreDetailPopup from "./ChoreDetailPopup";
import { monthRange, weekRange } from "@/lib/chores/calendarDates";

export type MyChoreRow = {
  assignmentId: string;
  status: string;
  acceptedAt: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  awardedPoints: number | null;
  incompleteReason: string | null;
  date: string;
  time: string | null;
  deadlineAt: string | null;
  points: number;
  choreName: string;
  choreInfo: string | null;
  requiresProof: boolean;
};

const ONGOING_STATUSES = ["unassigned", "assigned", "accepted", "unverified", "incomplete"];
const COMPLETED_STATUSES = ["verified_complete", "verified_partially_complete"];

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

type RangeFilter = "today" | "week" | "month" | "all";
const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All" },
];

// Recurring chores generate up to 60 instances at once, so without a date
// range the list gets huge — same problem the calendar had before it got
// Month/Week/Day views.
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

export default function MyChoresView({ chores, today }: { chores: MyChoreRow[]; today: string }) {
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");
  const [range, setRange] = useState<RangeFilter>("week");
  const [selected, setSelected] = useState<MyChoreRow | null>(null);

  const filtered = useMemo(() => {
    const byStatus = chores.filter((c) =>
      tab === "ongoing" ? ONGOING_STATUSES.includes(c.status) : COMPLETED_STATUSES.includes(c.status)
    );
    const byRange = byStatus.filter((c) => withinRange(c.date, range, today));
    return [...byRange].sort((a, b) =>
      tab === "ongoing" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    );
  }, [chores, tab, range, today]);

  return (
    <div>
      <div className="mb-3 flex gap-4 border-b border-calm-green/15">
        {(["ongoing", "completed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
            }`}
          >
            {t} Chores
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-calm-green/20 p-0.5">
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

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <li key={c.assignmentId}>
              <button
                onClick={() => setSelected(c)}
                className="w-full rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-left"
              >
                <p className="font-medium">{c.choreName}</p>
                <p className="text-sm text-calm-text/60">
                  {c.date}
                  {c.time ? ` ${c.time}` : ""} · {c.points} pt{c.points === 1 ? "" : "s"} ·{" "}
                  {STATUS_LABELS[c.status] ?? c.status}
                  {c.awardedPoints !== null ? ` · Awarded ${c.awardedPoints}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">
          No {tab} chores{range !== "all" ? ` for ${RANGE_OPTIONS.find((o) => o.key === range)?.label.toLowerCase()}` : ""}.
        </p>
      )}

      {selected && <ChoreDetailPopup chore={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
