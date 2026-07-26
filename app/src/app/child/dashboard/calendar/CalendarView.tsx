"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CalendarGrid, { type CalendarInstance } from "@/components/chores/CalendarGrid";
import ChorePopup from "./ChorePopup";

export default function CalendarView({
  year,
  month,
  instances,
  currentChildId,
}: {
  year: number;
  month: number;
  instances: CalendarInstance[];
  currentChildId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarInstance | null>(null);

  function goToMonth(y: number, m: number) {
    let newYear = y;
    let newMonth = m;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    router.push(`/child/dashboard/calendar?y=${newYear}&m=${newMonth + 1}`);
  }

  return (
    <>
      <CalendarGrid
        year={year}
        month={month}
        instances={instances}
        onSelect={setSelected}
        onPrevMonth={() => goToMonth(year, month - 1)}
        onNextMonth={() => goToMonth(year, month + 1)}
      />
      {selected && (
        <ChorePopup instance={selected} currentChildId={currentChildId} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
