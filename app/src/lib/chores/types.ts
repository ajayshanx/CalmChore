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

export type GroupedChore = {
  choreId: string;
  choreName: string;
  representative: CalendarInstance;
  assignments: CalendarAssignment[];
};

// Collapses same-chore instances on the same day into one row/pill with all
// assignments merged — showing one pill per (chore x assigned child) gets
// very busy on a month grid once a chore has more than one kid on it.
export function groupInstancesByChore(instances: CalendarInstance[]): GroupedChore[] {
  const order: string[] = [];
  const map = new Map<string, GroupedChore>();
  for (const instance of instances) {
    if (!map.has(instance.choreId)) {
      map.set(instance.choreId, {
        choreId: instance.choreId,
        choreName: instance.choreName,
        representative: instance,
        assignments: [],
      });
      order.push(instance.choreId);
    }
    map.get(instance.choreId)!.assignments.push(...instance.assignments);
  }
  return order.map((id) => map.get(id)!);
}
