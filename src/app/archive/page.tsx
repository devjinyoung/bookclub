'use client';

import { useEffect, useState } from 'react';
import { fetchArchivedBooks, type ArchivedBookWithMeta } from '@/lib/archive';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export default function ArchivePage() {
  const [archivedBooks, setArchivedBooks] = useState<ArchivedBookWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedBooks()
      .then((data) => {
        setArchivedBooks(data);
      })
      .catch(() => {
        setError('Unable to load archive.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="mt-1 text-sm text-slate-400">
          A shared history of every book your club has read.
        </p>
      </header>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
          Loading archive…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-xs text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && archivedBooks.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          No books in the archive yet — the club&apos;s reading history will appear here.
        </div>
      )}

      {!loading && !error && archivedBooks.length > 0 && (
        <ul className="space-y-3">
          {archivedBooks.map((entry) => (
            <li
              key={entry.id}
              className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
                {entry.book.cover_image_url ? (
                  <img
                    src={entry.book.cover_image_url}
                    alt={`Cover of ${entry.book.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>No cover</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{entry.book.title}</p>
                    <p className="text-xs text-slate-500">{entry.book.author}</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                    {MONTH_NAMES[entry.month - 1]} {entry.year}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Reading status controls will be added here in the next step.
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
