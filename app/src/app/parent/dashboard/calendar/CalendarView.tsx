"use client";

import { useMemo, useState } from "react";
import CalendarGrid, { type CalendarInstance, type ViewMode } from "@/components/chores/CalendarGrid";
import ChildFilter, { UNASSIGNED_FILTER_KEY } from "@/components/chores/ChildFilter";
import { addDaysStr, addMonthsStr, todayStr } from "@/lib/chores/calendarDates";
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
}: {
  instances: CalendarInstance[];
  familyChildren: { id: string; label: string; colour: string }[];
}) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedChild, setSelectedChild] = useState<CalendarInstance | null>(null);
  const [childFilter, setChildFilter] = useState<Set<string>>(
    () => new Set([...familyChildren.map((c) => c.id), UNASSIGNED_FILTER_KEY])
  );

  const filteredInstances = useMemo(
    () => filterInstances(instances, childFilter),
    [instances, childFilter]
  );

  function navigate(direction: -1 | 1) {
    setSelectedDate((prev) => {
      if (viewMode === "month") return addMonthsStr(prev, direction);
      if (viewMode === "week") return addDaysStr(prev, direction * 7);
      return addDaysStr(prev, direction);
    });
  }

  // The grid renders from the (possibly child-filtered) instance list, but
  // the popup needs the *full* assignment list regardless of which kids are
  // currently toggled on — otherwise "Assign" would think an already-
  // assigned child is still available. Resolve back to the unfiltered copy.
  function handleSelect(instance: CalendarInstance) {
    setSelectedChild(instances.find((i) => i.id === instance.id) ?? instance);
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
        onSelect={setSelectedChild}
        onNavigate={navigate}
        onViewModeChange={setViewMode}
        onToday={() => setSelectedDate(todayStr())}
      />

      {selectedChild && (
        <ChorePopup
          instance={selectedChild}
          familyChildren={familyChildren}
          onClose={() => setSelectedChild(null)}
        />
      )}
    </>
  );
}
