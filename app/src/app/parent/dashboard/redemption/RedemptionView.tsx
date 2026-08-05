"use client";

import RedemptionRequestCard from "./RedemptionRequestCard";
import { CATEGORY_ICONS, CATEGORY_LABELS, formatRequestDetails, type RedemptionCategory, type RequestDetails } from "@/lib/redemption";
import type { RedemptionGuidance } from "@/lib/redemptionGuidance";

export type RedemptionRequestRow = {
  id: string;
  childId: string;
  childLabel: string;
  childCurrentPoints: number;
  category: string;
  details: RequestDetails | null;
  status: string;
  pointsUsed: number | null;
  rejectionReason: string | null;
  createdAt: string;
  guidance: RedemptionGuidance;
};

function DecidedGrid({
  title,
  rows,
  emptyText,
  extraColumn,
}: {
  title: string;
  rows: RedemptionRequestRow[];
  emptyText: string;
  extraColumn: (row: RedemptionRequestRow) => React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-calm-text/70">{title}</p>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-calm-green/15 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {CATEGORY_ICONS[row.category as RedemptionCategory] ?? ""}{" "}
                  {CATEGORY_LABELS[row.category as RedemptionCategory] ?? row.category} · {row.childLabel}
                </p>
                <p className="truncate text-xs text-calm-text/50">
                  {formatRequestDetails(row.category, row.details)}
                </p>
              </div>
              {extraColumn(row)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">{emptyText}</p>
      )}
    </div>
  );
}

export default function RedemptionView({ requests }: { requests: RedemptionRequestRow[] }) {
  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-calm-text/70">Requested Redemption</p>
        {pending.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {pending.map((row) => (
              <li key={row.id}>
                <RedemptionRequestCard row={row} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-calm-text/60">Nothing waiting on your review right now.</p>
        )}
      </div>

      <DecidedGrid
        title="Approved Redemption"
        rows={approved}
        emptyText="Nothing approved yet."
        extraColumn={(row) => (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            −{row.pointsUsed ?? 0} pts
          </span>
        )}
      />

      <DecidedGrid
        title="Rejected Requests"
        rows={rejected}
        emptyText="No rejected requests."
        extraColumn={(row) => (
          <span
            className="max-w-[45%] shrink-0 truncate text-right text-xs text-red-700"
            title={row.rejectionReason ?? ""}
          >
            {row.rejectionReason || "Declined"}
          </span>
        )}
      />
    </div>
  );
}
