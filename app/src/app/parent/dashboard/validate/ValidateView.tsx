"use client";

import { useState } from "react";
import ValidatePopup from "./ValidatePopup";
import FreezeRequestCard from "./FreezeRequestCard";

export type ValidationRow = {
  assignmentId: string;
  childId: string;
  choreInstanceId: string | null;
  choreName: string;
  childLabel: string;
  submittedAt: string | null;
  scheduledDate: string | null;
  dateFlag: "late" | "early" | null;
  deadlineAt: string | null;
  points: number;
  photoUrl: string | null;
};

function formatScheduledDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export type FreezeRequestRow = {
  freezeId: string;
  childLabel: string;
  freezeFrom: string;
  freezeTo: string;
  reason: string | null;
  requestedAt: string | null;
};

export default function ValidateView({
  pending,
  freezeRequests,
}: {
  pending: ValidationRow[];
  freezeRequests: FreezeRequestRow[];
}) {
  const [selected, setSelected] = useState<ValidationRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {freezeRequests.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-calm-text/70">Freeze Requests</p>
          <ul className="flex flex-col gap-2">
            {freezeRequests.map((row) => (
              <li key={row.freezeId}>
                <FreezeRequestCard row={row} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pending.map((row) => (
            <li key={row.assignmentId}>
              <button
                onClick={() => setSelected(row)}
                className="w-full rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-left"
              >
                <p className="font-medium">{row.choreName}</p>
                <p className="text-sm text-calm-text/60">
                  {row.childLabel} · {row.points} pt{row.points === 1 ? "" : "s"}
                  {row.submittedAt ? ` · Submitted ${new Date(row.submittedAt).toLocaleDateString()}` : ""}
                </p>
                {row.scheduledDate && row.dateFlag && (
                  <p className="mt-0.5 text-sm font-medium text-amber-700">
                    ⚠ For {formatScheduledDate(row.scheduledDate)}
                    {row.dateFlag === "late" ? " — submitted late" : " — submitted early"}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">Nothing waiting on your review right now.</p>
      )}

      {selected && <ValidatePopup row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
