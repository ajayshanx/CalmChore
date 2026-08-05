"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

// "Note that given that there could be hundreds of chores, we need a
// alphabetized grouping, where clicking on A lists all chores starting with
// A and so on. If the same alphabet has more than say 10-20 tasks ... we
// must implement pagination. There should also be a search textbox that
// searches across all alphabets" — Parent Login Options.txt, Chores tab.
// Shared across Active / Ongoing / Inactive / All Chores sub-tabs so the
// grouping + pagination logic isn't reimplemented four times.
const PAGE_SIZE = 15;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function bucketFor(name: string): string {
  const first = name.trim()[0]?.toUpperCase() ?? "";
  return ALPHABET.includes(first) ? first : "#";
}

export default function AlphaChoreList<T extends { id: string; name: string }>({
  items,
  search,
  renderItem,
  emptyLabel,
}: {
  items: T[];
  search: string;
  renderItem: (item: T) => ReactNode;
  emptyLabel: string;
}) {
  const [letter, setLetter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const searching = search.trim().length > 0;

  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const lettersWithItems = useMemo(() => {
    const s = new Set<string>();
    sorted.forEach((i) => s.add(bucketFor(i.name)));
    return s;
  }, [sorted]);

  const visible = useMemo(() => {
    if (searching) {
      const q = search.trim().toLowerCase();
      return sorted.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (!letter) return sorted;
    return sorted.filter((i) => bucketFor(i.name) === letter);
  }, [sorted, search, searching, letter]);

  // Reset back to page 1 whenever the underlying filtered set changes (new
  // letter, new search term, or the list itself shrinks below the current
  // page) so we never land on a page with no items.
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  useEffect(() => {
    setPage(0);
  }, [letter, search]);
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      {!searching && (
        <div className="mb-3 flex flex-wrap gap-1">
          <button
            onClick={() => setLetter(null)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              letter === null ? "bg-calm-green text-white" : "text-calm-green"
            }`}
          >
            All
          </button>
          {[...ALPHABET, "#"].map((l) => {
            const has = lettersWithItems.has(l);
            return (
              <button
                key={l}
                disabled={!has}
                onClick={() => setLetter(l)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  letter === l ? "bg-calm-green text-white" : has ? "text-calm-green" : "text-calm-text/25"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}

      {pageItems.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pageItems.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-calm-text/60">{emptyLabel}</p>
      )}

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="rounded-lg border border-calm-green/30 px-3 py-1 text-sm text-calm-green disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-xs text-calm-text/60">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="rounded-lg border border-calm-green/30 px-3 py-1 text-sm text-calm-green disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
