"use client";

import CreateBreakForm from "./CreateBreakForm";
import CancelBreakButton from "./CancelBreakButton";

export type BreakRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  childLabels: string[];
};

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BreaksView({
  familyChildren,
  breaks,
}: {
  familyChildren: { id: string; label: string; colour: string }[];
  breaks: BreakRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <CreateBreakForm familyChildren={familyChildren} />

      {breaks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {breaks.map((brk) => (
            <li
              key={brk.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {formatDate(brk.startDate)}
                  {brk.startDate !== brk.endDate ? ` – ${formatDate(brk.endDate)}` : ""}
                </p>
                <p className="truncate text-sm text-calm-text/60">
                  {brk.childLabels.length > 0 ? brk.childLabels.join(", ") : "No children"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    brk.status === "active" ? "bg-sky-100 text-sky-800" : "bg-calm-bg text-calm-text/50"
                  }`}
                >
                  {brk.status === "active" ? "Active" : "Cancelled"}
                </span>
                {brk.status === "active" && <CancelBreakButton breakId={brk.id} />}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">No Chore Breaks yet.</p>
      )}
    </div>
  );
}
