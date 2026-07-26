"use client";

import { pillClass } from "@/lib/chores/calendarColours";

export const UNASSIGNED_FILTER_KEY = "__unassigned__";

export default function ChildFilter({
  familyChildren,
  selected,
  onChange,
}: {
  familyChildren: { id: string; label: string; colour: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  const options = [
    ...familyChildren.map((c) => ({ key: c.id, label: c.label, colour: c.colour })),
    { key: UNASSIGNED_FILTER_KEY, label: "Unassigned", colour: "neutral" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.has(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggle(opt.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              active ? pillClass(opt.colour) : "border border-calm-text/15 text-calm-text/40"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
