"use client";

import { useState } from "react";
import ValidatePopup from "./ValidatePopup";

export type ValidationRow = {
  assignmentId: string;
  childId: string;
  choreInstanceId: string | null;
  choreName: string;
  childLabel: string;
  submittedAt: string | null;
  deadlineAt: string | null;
  points: number;
  photoUrl: string | null;
};

export default function ValidateView({ pending }: { pending: ValidationRow[] }) {
  const [selected, setSelected] = useState<ValidationRow | null>(null);

  return (
    <div>
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
