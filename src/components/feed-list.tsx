"use client";

import { useState, useTransition } from "react";
import { loadFeed, type FeedFilter } from "@/app/actions";
import type { FeedEntry } from "@/lib/data";
import { EntryCard } from "./entry-card";

const PAGE = 20;

export function FeedList({
  initial,
  filter,
  viewerId,
  showDate,
}: {
  initial: FeedEntry[];
  filter: FeedFilter;
  viewerId: string | null;
  showDate?: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [more, setMore] = useState(initial.length >= PAGE);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function loadMore() {
    setError(false);
    start(async () => {
      try {
        const next = await loadFeed(filter, entries.length);
        const seen = new Set(entries.map((e) => e.id));
        setEntries((cur) => [...cur, ...next.filter((e) => !seen.has(e.id))]);
        setMore(next.length >= PAGE);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="rise">
            <EntryCard entry={e} viewerId={viewerId} showDate={showDate} />
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-3 text-sm font-semibold">
          Couldn&apos;t load more entries. Check your connection and try again.
        </p>
      )}
      {more && (
        <button type="button" onClick={loadMore} disabled={pending} className="btn-ghost w-full">
          {pending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
