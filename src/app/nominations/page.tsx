"use client";

import { useEffect, useState } from "react";
import { BookSearch } from "@/components/BookSearch";
import {
  fetchNominationsWithVotes,
  type NominationWithMeta
} from "@/lib/nominations";

export default function NominationsPage() {
  const [nominations, setNominations] = useState<NominationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNominationsWithVotes()
      .then((data) => {
        setNominations(data);
      })
      .catch(() => {
        setError("Unable to load nominations.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nominations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Discover, nominate, and vote on future club reads.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Search for a book
        </h2>
        <p className="text-xs text-slate-500">
          This search uses the Google Books API. We&apos;ll reuse this in the
          &quot;Nominate a Book&quot; and &quot;Set Current Book&quot; flows.
        </p>
        <BookSearch />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Nominations
          </h2>
          <span className="text-xs text-slate-500">
            Sorted by votes (desc)
          </span>
        </div>

        {loading && (
          <p className="text-xs text-slate-500">Loading nominations…</p>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {!loading && !error && nominations.length === 0 && (
          <p className="text-xs text-slate-500">
            No nominations yet — be the first to nominate a book.
          </p>
        )}

        {!loading && !error && nominations.length > 0 && (
          <ul className="space-y-3">
            {nominations.map((nomination) => (
              <li
                key={nomination.id}
                className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
              >
                <div className="flex h-16 w-12 items-center justify-center rounded-md bg-slate-800 text-[10px] text-slate-500">
                  {nomination.book.cover_image_url ? "Cover" : "No cover"}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {nomination.book.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {nomination.book.author}
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                      {nomination.vote_count} vote
                      {nomination.vote_count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">{nomination.pitch}</p>
                  <p className="text-[11px] text-slate-500">
                    Nominated by{" "}
                    {nomination.nominator?.name ?? "Unknown member"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


