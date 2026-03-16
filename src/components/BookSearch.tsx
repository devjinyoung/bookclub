'use client';

import { useEffect, useState } from 'react';
import type { SearchBookPayload } from '@/lib/nominations';

export interface BookSearchResult extends SearchBookPayload {}

interface BookSearchProps {
  onSelect?(book: BookSearchResult): void;
}

export function BookSearch({ onSelect }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    setError(null);

    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Search failed.');
        }
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Search failed.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search for a book..."
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {results.length > 0 && (
        <ul className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-2 text-sm">
          {results.map((book) => (
            <li key={book.googleBooksId}>
              <button
                type="button"
                onClick={() => {
                  onSelect?.(book);
                  setResults([]);
                  setQuery('');
                }}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-slate-800"
              >
                <div className="flex h-10 w-7 items-center justify-center rounded bg-slate-800 text-[10px] text-slate-500">
                  {book.coverImageUrl ? 'Cover' : 'No cover'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-200">{book.title}</p>
                  <p className="text-[11px] text-slate-500">{book.author}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
