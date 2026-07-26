"use client";

import { dotClass, pillClass } from "@/lib/chores/calendarColours";
import {
  addDaysStr,
  formatDateLabel,
  formatMonthLabel,
  formatWeekLabel,
  weekRange,
} from "@/lib/chores/calendarDates";
import { groupInstancesByChore, type CalendarInstance } from "@/lib/chores/types";

export type { CalendarAssignment, CalendarInstance } from "@/lib/chores/types";

export type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_GROUPS_PER_MONTH_CELL = 3;

function groupByDate(instances: CalendarInstance[]): Map<string, CalendarInstance[]> {
  const map = new Map<string, CalendarInstance[]>();
  for (const instance of instances) {
    const list = map.get(instance.date) ?? [];
    list.push(instance);
    map.set(instance.date, list);
  }
  return map;
}

function AssignmentDots({ assignments }: { assignments: CalendarInstance["assignments"] }) {
  if (assignments.length === 0) {
    return <span className={`h-2 w-2 rounded-full ${dotClass("neutral")}`} title="Unassigned" />;
  }
  return (
    <span className="flex -space-x-0.5">
      {assignments.slice(0, 4).map((a) => (
        <span
          key={a.id}
          className={`h-2 w-2 rounded-full ring-1 ring-white ${dotClass(a.colour)}`}
          title={a.childLabel}
        />
      ))}
      {assignments.length > 4 && (
        <span className="text-[9px] text-calm-text/50">+{assignments.length - 4}</span>
      )}
    </span>
  );
}

export default function CalendarGrid({
  viewMode,
  selectedDate,
  instances,
  onSelect,
  onNavigate,
  onViewModeChange,
  onToday,
}: {
  viewMode: ViewMode;
  selectedDate: string;
  instances: CalendarInstance[];
  onSelect: (instance: CalendarInstance) => void;
  onNavigate: (direction: -1 | 1) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToday: () => void;
}) {
  const byDate = groupByDate(instances);

  const label =
    viewMode === "month"
      ? formatMonthLabel(selectedDate)
      : viewMode === "week"
        ? formatWeekLabel(selectedDate)
        : formatDateLabel(selectedDate);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(-1)}
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm text-calm-green"
          >
            ← Prev
          </button>
          <button
            onClick={onToday}
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm text-calm-green"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm text-calm-green"
          >
            Next →
          </button>
        </div>
        <p className="font-medium text-calm-green">{label}</p>
        <div className="flex gap-1 rounded-lg border border-calm-green/20 p-0.5">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${
                viewMode === mode ? "bg-calm-green text-white" : "text-calm-green"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" && (
        <MonthGrid selectedDate={selectedDate} byDate={byDate} onSelect={onSelect} />
      )}
      {viewMode === "week" && (
        <WeekStrip selectedDate={selectedDate} byDate={byDate} onSelect={onSelect} />
      )}
      {viewMode === "day" && (
        <DayList selectedDate={selectedDate} byDate={byDate} onSelect={onSelect} />
      )}
    </div>
  );
}

function MonthGrid({
  selectedDate,
  byDate,
  onSelect,
}: {
  selectedDate: string;
  byDate: Map<string, CalendarInstance[]>;
  onSelect: (instance: CalendarInstance) => void;
}) {
  const anchor = new Date(`${selectedDate}T00:00:00Z`);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-calm-text/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayInstances = byDate.get(dateStr) ?? [];
          const grouped = groupInstancesByChore(dayInstances);
          return (
            <div
              key={dateStr}
              className="min-h-[76px] rounded-lg border border-calm-green/10 bg-white p-1 text-left"
            >
              <p className="text-xs text-calm-text/50">{day}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {grouped.slice(0, MAX_GROUPS_PER_MONTH_CELL).map((g) => (
                  <button
                    key={g.choreId}
                    onClick={() => onSelect(g.representative)}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-calm-bg"
                    title={g.choreName}
                  >
                    <AssignmentDots assignments={g.assignments} />
                    <span className="truncate">{g.choreName}</span>
                  </button>
                ))}
                {grouped.length > MAX_GROUPS_PER_MONTH_CELL && (
                  <p className="text-[10px] text-calm-text/50">
                    +{grouped.length - MAX_GROUPS_PER_MONTH_CELL} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({
  selectedDate,
  byDate,
  onSelect,
}: {
  selectedDate: string;
  byDate: Map<string, CalendarInstance[]>;
  onSelect: (instance: CalendarInstance) => void;
}) {
  const [weekStart] = weekRange(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((dateStr) => {
        const dayInstances = byDate.get(dateStr) ?? [];
        const grouped = groupInstancesByChore(dayInstances);
        const dayNum = new Date(`${dateStr}T00:00:00Z`).getUTCDate();
        return (
          <div key={dateStr} className="min-h-[220px] rounded-lg border border-calm-green/10 bg-white p-2">
            <p className="mb-1 text-xs font-medium text-calm-text/50">
              {WEEKDAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()]} {dayNum}
            </p>
            <div className="flex flex-col gap-1">
              {grouped.map((g) => (
                <button
                  key={g.choreId}
                  onClick={() => onSelect(g.representative)}
                  className="rounded px-1.5 py-1 text-left text-xs hover:bg-calm-bg"
                >
                  <span className="mb-0.5 flex items-center gap-1">
                    <AssignmentDots assignments={g.assignments} />
                    <span className="truncate font-medium">{g.choreName}</span>
                  </span>
                </button>
              ))}
              {grouped.length === 0 && <p className="text-xs text-calm-text/40">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  selectedDate,
  byDate,
  onSelect,
}: {
  selectedDate: string;
  byDate: Map<string, CalendarInstance[]>;
  onSelect: (instance: CalendarInstance) => void;
}) {
  const grouped = groupInstancesByChore(byDate.get(selectedDate) ?? []);

  if (grouped.length === 0) {
    return <p className="text-sm text-calm-text/60">Nothing scheduled this day.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {grouped.map((g) => (
        <li key={g.choreId}>
          <button
            onClick={() => onSelect(g.representative)}
            className="flex w-full items-center justify-between rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-left"
          >
            <div>
              <p className="font-medium">{g.choreName}</p>
              <p className="text-sm text-calm-text/60">
                {g.representative.points} pt{g.representative.points === 1 ? "" : "s"}
                {g.representative.time ? ` · ${g.representative.time}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <AssignmentDots assignments={g.assignments} />
              {g.assignments.length > 0 ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {g.assignments.map((a) => (
                    <span
                      key={a.id}
                      className={`rounded-full px-2 py-0.5 text-[11px] ${pillClass(a.colour)}`}
                    >
                      {a.childLabel}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-xs text-calm-text/50">Unassigned</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
