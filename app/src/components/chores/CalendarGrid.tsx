"use client";

import { pillClass } from "@/lib/chores/calendarColours";

export type CalendarAssignment = {
  id: string;
  childId: string;
  childLabel: string;
  colour: string;
  status: string;
};

export type CalendarInstance = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  deadlineAt: string | null;
  points: number;
  choreId: string;
  choreName: string;
  choreInfo: string | null;
  assignmentType: string;
  assignments: CalendarAssignment[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  year,
  month, // 0-indexed
  instances,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  instances: CalendarInstance[];
  onSelect: (instance: CalendarInstance) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay();

  const instancesByDate = new Map<string, CalendarInstance[]>();
  for (const instance of instances) {
    const list = instancesByDate.get(instance.date) ?? [];
    list.push(instance);
    instancesByDate.set(instance.date, list);
  }

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = firstOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm text-calm-green"
        >
          ← Prev
        </button>
        <p className="font-medium text-calm-green">{monthLabel}</p>
        <button
          onClick={onNextMonth}
          className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm text-calm-green"
        >
          Next →
        </button>
      </div>

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
          const dayInstances = instancesByDate.get(dateStr) ?? [];
          return (
            <div
              key={dateStr}
              className="min-h-[72px] rounded-lg border border-calm-green/10 bg-white p-1 text-left"
            >
              <p className="text-xs text-calm-text/50">{day}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayInstances.slice(0, 3).map((instance) =>
                  instance.assignments.length > 0 ? (
                    instance.assignments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onSelect(instance)}
                        className={`truncate rounded px-1 py-0.5 text-left text-[11px] ${pillClass(a.colour)}`}
                        title={instance.choreName}
                      >
                        {instance.choreName}
                      </button>
                    ))
                  ) : (
                    <button
                      key={instance.id}
                      onClick={() => onSelect(instance)}
                      className={`truncate rounded px-1 py-0.5 text-left text-[11px] ${pillClass("neutral")}`}
                      title={instance.choreName}
                    >
                      {instance.choreName}
                    </button>
                  )
                )}
                {dayInstances.length > 3 && (
                  <p className="text-[10px] text-calm-text/50">+{dayInstances.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
