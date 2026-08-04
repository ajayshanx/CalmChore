"use client";

import { useMemo, useState } from "react";
import CalendarGrid, { type CalendarInstance, type ViewMode } from "@/components/chores/CalendarGrid";
import ChildFilter, { UNASSIGNED_FILTER_KEY } from "@/components/chores/ChildFilter";
import { addDaysStr, addMonthsStr } from "@/lib/chores/calendarDates";
import ChorePopup from "./ChorePopup";

function filterInstances(instances: CalendarInstance[], selected: Set<string>): CalendarInstance[] {
  const result: CalendarInstance[] = [];
  for (const instance of instances) {
    if (instance.assignments.length === 0) {
      if (selected.has(UNASSIGNED_FILTER_KEY)) result.push(instance);
      continue;
    }
    const assignments = instance.assignments.filter((a) => selected.has(a.childId));
    if (assignments.length > 0) result.push({ ...instance, assignments });
  }
  return result;
}

export default function CalendarView({
  instances,
  familyChildren,
  currentChildId,
  initialToday,
  breakDates = [],
}: {
  instances: CalendarInstance[];
  familyChildren: { id: string; label: string; colour: string }[];
  currentChildId: string;
  initialToday: string;
  breakDates?: string[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedInstance, setSelectedInstance] = useState<CalendarInstance | null>(null);
  const [childFilter, setChildFilter] = useState<Set<string>>(
    () => new Set([...familyChildren.map((c) => c.id), UNASSIGNED_FILTER_KEY])
  );

  const filteredInstances = useMemo(
    () => filterInstances(instances, childFilter),
    [instances, childFilter]
  );

  const breakDateSet = useMemo(() => new Set(breakDates), [breakDates]);

  function navigate(direction: -1 | 1) {
    setSelectedDate((prev) => {
      if (viewMode === "month") return addMonthsStr(prev, direction);
      if (viewMode === "week") return addDaysStr(prev, direction * 7);
      return addDaysStr(prev, direction);
    });
  }

  // Same fix as the parent calendar: the grid only sees the filtered list,
  // but the popup's accept/assignment logic needs every assignment on the
  // instance, not just the ones matching the active filter.
  function handleSelect(instance: CalendarInstance) {
    setSelectedInstance(instances.find((i) => i.id === instance.id) ?? instance);
  }

  return (
    <>
      <div className="mb-4">
        <ChildFilter
          familyChildren={familyChildren}
          selected={childFilter}
          onChange={setChildFilter}
        />
      </div>

      <CalendarGrid
        viewMode={viewMode}
        selectedDate={selectedDate}
        instances={filteredInstances}
        onSelect={handleSelect}
        onNavigate={navigate}
        onViewModeChange={setViewMode}
        onToday={() => setSelectedDate(initialToday)}
        breakDates={breakDateSet}
      />

      {selectedInstance && (
        <ChorePopup
          instance={selectedInstance}
          currentChildId={currentChildId}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </>
  );
}
