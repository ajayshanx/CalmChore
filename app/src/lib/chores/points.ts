// Shared "feels like" minutes -> suggested points logic, used both by the
// Create Chore form and the Example Chores (Chore Ideas) library, per
// "Calm Chore Creation.txt": points = ceil(minutes / 10), minimum 1.
export function suggestedPoints(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / 10));
}

export const FEELS_LIKE_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
