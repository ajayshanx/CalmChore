"use client";

import { useMemo, useState } from "react";
import CreateChoreForm, { type ChorePrefill } from "./CreateChoreForm";
import { AGE_GROUPS, EXAMPLE_CHORES } from "@/lib/chores/exampleChores";

export type ChoreRow = {
  id: string;
  name: string;
  info: string | null;
  points: number;
  status: string;
  assignment_type: string;
  requires_proof: boolean;
};

type Tab = "active" | "inactive" | "ideas";

export default function ChoresView({
  chores,
  familyChildren,
}: {
  chores: ChoreRow[];
  familyChildren: { id: string; label: string }[];
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<ChorePrefill | undefined>(undefined);
  const [ageFilter, setAgeFilter] = useState<string>("all");

  const filteredChores = useMemo(() => {
    const byStatus = chores.filter((c) => c.status === (tab === "inactive" ? "inactive" : "active"));
    if (!search.trim()) return byStatus;
    const q = search.trim().toLowerCase();
    return byStatus.filter((c) => c.name.toLowerCase().includes(q));
  }, [chores, tab, search]);

  const filteredIdeas = useMemo(() => {
    return EXAMPLE_CHORES.filter((c) => ageFilter === "all" || c.ageGroup === ageFilter).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [ageFilter]);

  function openCreate(p?: ChorePrefill) {
    setPrefill(p);
    setShowCreate(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 border-b border-calm-green/15">
          {(["active", "inactive", "ideas"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium capitalize ${
                tab === t
                  ? "border-b-2 border-calm-green text-calm-green"
                  : "text-calm-text/50"
              }`}
            >
              {t === "ideas" ? "Chore Ideas" : `${t} Chores`}
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
          {filteredChores.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {filteredChores.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-calm-green/20 bg-white px-4 py-3"
                >
                  <p className="font-medium">{c.name}</p>
                  {c.info && <p className="text-sm text-calm-text/60">{c.info}</p>}
                  <p className="mt-1 text-sm text-calm-text/60">
                    {c.points} pt{c.points === 1 ? "" : "s"} ·{" "}
                    {c.assignment_type === "multi" ? "Multiple children" : "Single child"}
                    {c.requires_proof ? " · Photo proof required" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-calm-text/60">No {tab} chores yet.</p>
          )}
        </div>
      ) : (
        <div>
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
      )}
    </div>
  );
}
