"use client";

import { useMemo, useState } from "react";
import CreateChoreForm, { type ChorePrefill } from "./CreateChoreForm";
import ChoreDetailPopup from "./ChoreDetailPopup";
import ChoreIdeaCard from "./ChoreIdeaCard";
import AlphaChoreList from "./AlphaChoreList";
import FaceIcon, { type FaceStatus } from "@/components/icons/FaceIcon";
import { AGE_GROUPS, EXAMPLE_CHORES } from "@/lib/chores/exampleChores";

export type InstanceAssignment = {
  childId: string;
  childLabel: string;
  status: string;
  awardedPoints: number | null;
};

export type ChoreInstanceSummary = {
  id: string;
  date: string;
  time: string | null;
  deadlineAt: string | null;
  points: number;
  assignments: InstanceAssignment[];
};

export type ChoreRow = {
  id: string;
  name: string;
  info: string | null;
  points: number;
  status: string;
  assignment_type: string;
  requires_proof: boolean;
  instances: ChoreInstanceSummary[];
};

// "Chore Ideas from other families" — the chores_ideas_select RLS policy
// already limits what the page query can see to active, actually-used
// chores from any family; likeCount/likedByMe come from the chore_likes
// table + trigger.
export type ChoreIdeaRow = {
  id: string;
  name: string;
  info: string | null;
  points: number;
  likeCount: number;
  likedByMe: boolean;
};

type Tab = "active" | "ongoing" | "inactive" | "all" | "ideas";

const MOST_POPULAR_LIMIT = 10;

const ONGOING_ASSIGNMENT_STATUSES = ["assigned", "accepted", "unverified", "incomplete"];
const VERIFIED_STATUSES = ["verified_complete", "verified_partially_complete"];

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  unverified: "Awaiting review",
  incomplete: "Incomplete",
  verified_complete: "Complete",
  verified_partially_complete: "Partially Complete",
};

function isOutcome(status: string): status is FaceStatus {
  return status === "verified_complete" || status === "verified_partially_complete" || status === "incomplete";
}

function sortedInstances(chore: ChoreRow): ChoreInstanceSummary[] {
  return [...chore.instances].sort((a, b) => a.date.localeCompare(b.date));
}

function hasOngoingAssignment(chore: ChoreRow): boolean {
  return chore.instances.some((inst) =>
    inst.assignments.some((a) => ONGOING_ASSIGNMENT_STATUSES.includes(a.status))
  );
}

// "information that shows should be related to the current instance of the
// chore (if not verified complete or partially complete) OR the next
// instance of the chore" — Parent Login Options.txt, Chores tab.
function displayInstance(chore: ChoreRow): ChoreInstanceSummary | null {
  const sorted = sortedInstances(chore);
  const notFullyVerified = sorted.find(
    (inst) =>
      inst.assignments.length === 0 || inst.assignments.some((a) => !VERIFIED_STATUSES.includes(a.status))
  );
  return notFullyVerified ?? sorted[sorted.length - 1] ?? null;
}

function nextInstance(chore: ChoreRow, today: string): ChoreInstanceSummary | null {
  return sortedInstances(chore).find((i) => i.date >= today) ?? null;
}

function previousInstance(chore: ChoreRow, today: string): ChoreInstanceSummary | null {
  const past = sortedInstances(chore).filter((i) => i.date < today);
  return past.length > 0 ? past[past.length - 1] : null;
}

function formatInstanceDate(i: ChoreInstanceSummary | null): string {
  if (!i) return "—";
  return i.time ? `${i.date} ${i.time}` : i.date;
}

export default function ChoresView({
  chores,
  familyChildren,
  choreIdeas,
  today,
}: {
  chores: ChoreRow[];
  familyChildren: { id: string; label: string }[];
  choreIdeas: ChoreIdeaRow[];
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<ChorePrefill | undefined>(undefined);
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [ideasView, setIdeasView] = useState<"popular" | "all">("popular");
  const [selectedChoreId, setSelectedChoreId] = useState<string | null>(null);
  // Derived from the live `chores` prop (rather than snapshotted at click
  // time) so the popup reflects a just-saved edit once the route refreshes,
  // instead of showing stale values from before the save.
  const selectedChore = chores.find((c) => c.id === selectedChoreId) ?? null;

  const tabChores = useMemo(() => {
    switch (tab) {
      case "active":
        // "Active Chores would list all created chores that have a current
        // or future schedule" — active status + at least one instance today
        // or later.
        return chores.filter((c) => c.status === "active" && c.instances.some((i) => i.date >= today));
      case "ongoing":
        // "Ongoing Chores would list all created chores accepted or
        // assigned by one or more children"
        return chores.filter(hasOngoingAssignment);
      case "inactive":
        return chores.filter((c) => c.status === "inactive");
      case "all":
        return chores;
      default:
        return [];
    }
  }, [chores, tab, today]);

  const filteredIdeas = useMemo(() => {
    return EXAMPLE_CHORES.filter((c) => ageFilter === "all" || c.ageGroup === ageFilter).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [ageFilter]);

  // choreIdeas already arrives sorted by like_count desc from the page
  // query — "Most Popular" just takes the top slice of that; "View All"
  // re-sorts the same set alphabetically, per spec.
  const visibleOtherFamilyIdeas = useMemo(() => {
    if (ideasView === "popular") return choreIdeas.slice(0, MOST_POPULAR_LIMIT);
    return [...choreIdeas].sort((a, b) => a.name.localeCompare(b.name));
  }, [choreIdeas, ideasView]);

  function openCreate(p?: ChorePrefill) {
    setPrefill(p);
    setShowCreate(true);
  }

  // Active / Ongoing rows show instance-level detail (Schedule, Deadline,
  // Points, Assigned To / Accepted By, Status) per spec.
  function renderInstanceRow(c: ChoreRow) {
    const inst = displayInstance(c);
    return (
      <button
        onClick={() => setSelectedChoreId(c.id)}
        className="w-full rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-left hover:border-calm-green/40"
      >
        <p className="font-medium">{c.name}</p>
        {inst ? (
          <>
            <p className="mt-1 text-sm text-calm-text/60">
              {formatInstanceDate(inst)} · {inst.points} pt{inst.points === 1 ? "" : "s"}
              {inst.deadlineAt ? ` · Due ${new Date(inst.deadlineAt).toLocaleString()}` : ""}
            </p>
            {inst.assignments.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {inst.assignments.map((a) => (
                  <li key={a.childId} className="flex items-center gap-1 text-sm text-calm-text/60">
                    <span>{a.childLabel}:</span>
                    {isOutcome(a.status) && <FaceIcon status={a.status} size={14} />}
                    {STATUS_LABELS[a.status] ?? a.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-calm-text/60">Unassigned</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-calm-text/60">No instances yet</p>
        )}
      </button>
    );
  }

  // Inactive / All Chores rows show basic chore info only — no per-instance
  // assignment/status detail, per spec.
  function renderBasicRow(c: ChoreRow) {
    return (
      <button
        onClick={() => setSelectedChoreId(c.id)}
        className="w-full rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-left hover:border-calm-green/40"
      >
        <p className="font-medium">{c.name}</p>
        {c.info && <p className="text-sm text-calm-text/60">{c.info}</p>}
        <p className="mt-1 text-sm text-calm-text/60">
          Current/Next: {formatInstanceDate(nextInstance(c, today))} · Previous:{" "}
          {formatInstanceDate(previousInstance(c, today))}
        </p>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 border-b border-calm-green/15">
          {(["active", "ongoing", "inactive", "all", "ideas"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium capitalize ${
                tab === t ? "border-b-2 border-calm-green text-calm-green" : "text-calm-text/50"
              }`}
            >
              {t === "ideas" ? "Chore Ideas" : t === "all" ? "All Chores" : `${t} Chores`}
            </button>
          ))}
        </div>
        {tab !== "ideas" && (
          <button
            onClick={() => openCreate(undefined)}
            className="rounded-xl bg-calm-green px-5 py-2.5 text-sm font-medium text-white"
          >
            Create Chore
          </button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border border-calm-green/20 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-calm-green">New Chore</p>
            <button
              onClick={() => setShowCreate(false)}
              className="text-sm text-calm-text/60 underline"
            >
              Cancel
            </button>
          </div>
          <CreateChoreForm
            familyChildren={familyChildren}
            prefill={prefill}
            onDone={() => setShowCreate(false)}
          />
        </div>
      )}

      {tab !== "ideas" ? (
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chores by name…"
            className="mb-4 w-full max-w-sm rounded-lg border border-calm-green/30 px-4 py-2.5"
          />
          <AlphaChoreList
            items={tabChores}
            search={search}
            emptyLabel={tab === "all" ? "No chores yet." : `No ${tab} chores yet.`}
            renderItem={tab === "active" || tab === "ongoing" ? renderInstanceRow : renderBasicRow}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-2 text-sm font-semibold text-calm-green">Example Chores</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setAgeFilter("all")}
                className={`rounded-full border px-3 py-1 text-sm ${
                  ageFilter === "all"
                    ? "border-calm-green bg-calm-greenLight text-calm-green"
                    : "border-calm-green/30 text-calm-text/70"
                }`}
              >
                All ages
              </button>
              {AGE_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setAgeFilter(g)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    ageFilter === g
                      ? "border-calm-green bg-calm-greenLight text-calm-green"
                      : "border-calm-green/30 text-calm-text/70"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <ul className="flex flex-col gap-2">
              {filteredIdeas.map((idea) => (
                <li
                  key={idea.name}
                  className="flex items-center justify-between rounded-lg border border-calm-green/20 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{idea.name}</p>
                    <p className="text-sm text-calm-text/60">
                      Age {idea.ageGroup} · ~{idea.minutes} min · {idea.points} pt
                      {idea.points === 1 ? "" : "s"} suggested
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      openCreate({ name: idea.name, info: "", points: idea.points })
                    }
                    className="rounded-lg border border-calm-green px-3 py-1.5 text-sm font-medium text-calm-green hover:bg-calm-greenLight"
                  >
                    Add as Chore
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-calm-green">Chore Ideas from Other Families</p>
              <div className="flex gap-1 rounded-lg border border-calm-green/20 p-0.5">
                <button
                  onClick={() => setIdeasView("popular")}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    ideasView === "popular" ? "bg-calm-green text-white" : "text-calm-green"
                  }`}
                >
                  Most Popular
                </button>
                <button
                  onClick={() => setIdeasView("all")}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    ideasView === "all" ? "bg-calm-green text-white" : "text-calm-green"
                  }`}
                >
                  View All
                </button>
              </div>
            </div>
            {visibleOtherFamilyIdeas.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {visibleOtherFamilyIdeas.map((idea) => (
                  <ChoreIdeaCard
                    key={idea.id}
                    idea={idea}
                    onAdd={() => openCreate({ name: idea.name, info: idea.info ?? "", points: idea.points })}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-calm-text/60">
                No chore ideas from other families yet — check back once more families are using
                Calm Chore.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedChore && (
        <ChoreDetailPopup
          chore={selectedChore}
          familyChildren={familyChildren}
          onClose={() => setSelectedChoreId(null)}
          onDuplicate={(c) => {
            setSelectedChoreId(null);
            openCreate({
              name: `Copy of ${c.name}`,
              info: c.info ?? "",
              points: c.points,
              assignmentType: c.assignment_type,
              requiresProof: c.requires_proof,
            });
          }}
        />
      )}
    </div>
  );
}
