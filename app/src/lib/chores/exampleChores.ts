import { suggestedPoints } from "./points";

// Curated, always-visible starter chores per "Parent Login Options.txt" ->
// Chore Ideas -> Example Chores. Reference content only, not user-submitted
// — every field is still fully editable when a parent adds one for their
// own family. "Chore Ideas from other families" (cross-family sharing,
// Likes, Most Popular ranking) is a separate, larger feature — deferred.
export type AgeGroup = "2-3" | "4-6" | "7-11" | "12+";

export const AGE_GROUPS: AgeGroup[] = ["2-3", "4-6", "7-11", "12+"];

export type ExampleChore = {
  name: string;
  ageGroup: AgeGroup;
  minutes: number;
  points: number;
};

function chore(name: string, ageGroup: AgeGroup, minutes: number): ExampleChore {
  return { name, ageGroup, minutes, points: suggestedPoints(minutes) };
}

export const EXAMPLE_CHORES: ExampleChore[] = [
  // 2-3 Years
  chore("Pick up toys and books", "2-3", 5),
  chore("Put trash in garbage can", "2-3", 2),
  chore("Put laundry in hamper", "2-3", 3),
  chore("Dust", "2-3", 10),
  chore("Put away silverware", "2-3", 5),
  chore("Wipe baseboards", "2-3", 10),
  chore("Fold rags and dishcloths", "2-3", 5),
  chore("Put clothes in hamper", "2-3", 3),
  chore("Put clothes away in drawers", "2-3", 5),

  // 4-6 Years (in addition to all 2-3 Years chores)
  chore("Take care of pets", "4-6", 10),
  chore("Set and clear the table", "4-6", 10),
  chore("Match socks", "4-6", 10),
  chore("Putting away groceries", "4-6", 10),
  chore("Make bed", "4-6", 5),
  chore("Wipe down dirty walls", "4-6", 10),
  chore("Empty trash", "4-6", 5),
  chore("Sweep with small broom", "4-6", 10),

  // 7-11 Years (in addition to all previous)
  chore("Fold laundry", "7-11", 20),
  chore("Sweep", "7-11", 15),
  chore("Vacuuming", "7-11", 15),
  chore("Take out trash", "7-11", 5),
  chore("Wash mirrors", "7-11", 10),
  chore("Meal prep", "7-11", 20),
  chore("Take trashcan to curb", "7-11", 5),
  chore("Weed flowers / garden", "7-11", 25),
  chore("Clean out the car", "7-11", 20),
  chore("Clean toilets", "7-11", 15),
  chore("Clean room", "7-11", 20),
  chore("Organize toy room", "7-11", 20),
  chore("Bring in mail / newspaper", "7-11", 2),

  // 12+ Years (in addition to all previous)
  chore("Mow lawn", "12+", 40),
  chore("Babysit siblings", "12+", 30),
  chore("Wash windows", "12+", 25),
  chore("Iron", "12+", 20),
  chore("Wash car", "12+", 30),
  chore("Cook simple meals", "12+", 30),
  chore("Laundry - wash, dry & fold", "12+", 30),
  chore("Mop floors", "12+", 20),
  chore("Clean bathroom", "12+", 25),
  chore("Clean out fridge", "12+", 25),
];
