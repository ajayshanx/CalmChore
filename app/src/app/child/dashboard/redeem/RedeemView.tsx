"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestRedemption } from "./actions";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  REDEMPTION_CATEGORIES,
  SCREEN_TIME_INTERVALS,
  formatRequestDetails,
  type RedemptionCategory,
  type RequestDetails,
} from "@/lib/redemption";

export type RedemptionRow = {
  id: string;
  category: string;
  details: RequestDetails | null;
  status: string;
  pointsUsed: number | null;
  rejectionReason: string | null;
  createdAt: string;
};

const initialState: { error?: string; success?: boolean } = {};

function RequestForm() {
  const [category, setCategory] = useState<RedemptionCategory | null>(null);
  const [state, formAction, pending] = useActionState(requestRedemption, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setCategory(null);
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-calm-green/20 bg-white px-4 py-4">
      <p className="text-sm font-medium text-calm-green">Request a Redemption</p>

      <input type="hidden" name="category" value={category ?? ""} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {REDEMPTION_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center ${
              category === c ? "border-calm-green bg-calm-bg" : "border-calm-green/20"
            }`}
          >
            <span className="text-xl">{CATEGORY_ICONS[c]}</span>
            <span className="text-[11px] font-medium leading-tight text-calm-text">{CATEGORY_LABELS[c]}</span>
          </button>
        ))}
      </div>

      {(category === "grocery" || category === "purchases" || category === "other") && (
        <label className="text-xs text-calm-text/60">
          What would you like?
          <input
            type="text"
            name="whatWouldYouLike"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
      )}

      {category === "eating_out" && (
        <label className="text-xs text-calm-text/60">
          Restaurant / cuisine / what you&apos;d like
          <input
            type="text"
            name="restaurantCuisine"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
      )}

      {category === "screen_time" && (
        <>
          <label className="text-xs text-calm-text/60">
            Time interval
            <select
              name="interval"
              required
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
            >
              <option value="" disabled>
                Choose an interval
              </option>
              {SCREEN_TIME_INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-calm-text/60">
            Purpose of time
            <input
              type="text"
              name="purpose"
              required
              className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
            />
          </label>
        </>
      )}

      {category === "cash" && (
        <label className="text-xs text-calm-text/60">
          Amount
          <input
            type="text"
            name="amount"
            required
            className="mt-1 w-full rounded-lg border border-calm-green/30 px-3 py-2 text-sm text-calm-text"
          />
        </label>
      )}

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      {category && (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-calm-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Requesting…" : "Request Redemption"}
        </button>
      )}
    </form>
  );
}

function RequestGrid({
  title,
  rows,
  emptyText,
  extraColumn,
}: {
  title: string;
  rows: RedemptionRow[];
  emptyText: string;
  extraColumn?: (row: RedemptionRow) => React.ReactNode;
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
                  {CATEGORY_ICONS[row.category as RedemptionCategory] ?? ""} {CATEGORY_LABELS[row.category as RedemptionCategory] ?? row.category}
                </p>
                <p className="truncate text-xs text-calm-text/50">
                  {formatRequestDetails(row.category, row.details)}
                </p>
              </div>
              {extraColumn?.(row)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">{emptyText}</p>
      )}
    </div>
  );
}

export default function RedeemView({
  totalPoints,
  requests,
}: {
  totalPoints: number;
  requests: RedemptionRow[];
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-calm-green/20 bg-white px-5 py-4 text-center">
        <p className="text-3xl font-semibold text-calm-green">{totalPoints}</p>
        <p className="text-sm text-calm-text/50">Points Available</p>
      </div>

      <RequestForm />

      <RequestGrid title="Requested Redemption" rows={pending} emptyText="No pending requests." />

      <RequestGrid
        title="Approved Redemption"
        rows={approved}
        emptyText="Nothing approved yet."
        extraColumn={(row) => (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            −{row.pointsUsed ?? 0} pts
          </span>
        )}
      />

      <RequestGrid
        title="Rejected Requests"
        rows={rejected}
        emptyText="No rejected requests."
        extraColumn={(row) => (
          <span className="max-w-[45%] shrink-0 truncate text-right text-xs text-red-700" title={row.rejectionReason ?? ""}>
            {row.rejectionReason || "Declined"}
          </span>
        )}
      />
    </div>
  );
}
