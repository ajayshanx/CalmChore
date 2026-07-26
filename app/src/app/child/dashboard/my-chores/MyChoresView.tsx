"use client";

import { useState } from "react";
import ChoreDetailPopup from "./ChoreDetailPopup";

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

export default function MyChoresView({ chores }: { chores: MyChoreRow[] }) {
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");
  const [selected, setSelected] = useState<MyChoreRow | null>(null);

  const filtered = chores.filter((c) =>
    tab === "ongoing" ? ONGOING_STATUSES.includes(c.status) : COMPLETED_STATUSES.includes(c.status)
  );

  return (
    <div>
      <div className="mb-4 flex gap-4 border-b border-calm-green/15">
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
        <p className="text-sm text-calm-text/60">No {tab} chores.</p>
      )}

      {selected && <ChoreDetailPopup chore={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
