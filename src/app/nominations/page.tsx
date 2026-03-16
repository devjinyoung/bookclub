'use client';

import { useEffect, useState } from 'react';
import { BookSearch, type BookSearchResult } from '@/components/BookSearch';
import {
  createNominationFromSearchPayload,
  fetchNominationsWithVotes,
  fetchUserVoteNominationIds,
  toggleVote,
  type NominationWithMeta,
} from '@/lib/nominations';
import { getCurrentUser } from '@/lib/profile';

// TODO (P4.2.c): Add Supabase Realtime subscriptions on `nominations` and
// `votes` to keep vote counts and list ordering in sync across clients.

export default function NominationsPage() {
  const [nominations, setNominations] = useState<NominationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isNominateOpen, setIsNominateOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [pitch, setPitch] = useState('');
  const [nominateError, setNominateError] = useState<string | null>(null);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [{ data }, nominationsData] = await Promise.all([
          getCurrentUser(),
          fetchNominationsWithVotes(),
        ]);

        if (data.user) {
          setCurrentUserId(data.user.id);
          const userVoteIds = await fetchUserVoteNominationIds(data.user.id);
          setVotedIds(new Set(userVoteIds));
        }

        setNominations(nominationsData);
      } catch {
        setError('Unable to load nominations.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleToggleVote(nomination: NominationWithMeta) {
    if (!currentUserId) return;

    const hasVoted = votedIds.has(nomination.id);

    setUpdatingId(nomination.id);
    try {
      await toggleVote(nomination.id, hasVoted, currentUserId);

      const nextVoted = new Set(votedIds);
      if (hasVoted) {
        nextVoted.delete(nomination.id);
      } else {
        nextVoted.add(nomination.id);
      }
      setVotedIds(nextVoted);

      setNominations((prev) => {
        const updated = prev.map((n) =>
          n.id === nomination.id
            ? {
                ...n,
                vote_count: n.vote_count + (hasVoted ? -1 : 1),
              }
            : n,
        );
        return [...updated].sort((a, b) => b.vote_count - a.vote_count);
      });
    } catch {
      // Could surface error to user later.
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateNomination() {
    if (!currentUserId) {
      setNominateError('You must be logged in to nominate a book.');
      return;
    }
    if (!selectedBook) {
      setNominateError('Please select a book first.');
      return;
    }
    if (!pitch.trim()) {
      setNominateError('Please add a short pitch for this book.');
      return;
    }
    if (pitch.length > 500) {
      setNominateError('Pitch must be 500 characters or less.');
      return;
    }

    setNominateLoading(true);
    setNominateError(null);

    try {
      const created = await createNominationFromSearchPayload(
        {
          googleBooksId: selectedBook.googleBooksId,
          title: selectedBook.title,
          author: selectedBook.author,
          coverImageUrl: selectedBook.coverImageUrl,
        },
        pitch.trim(),
        currentUserId,
      );

      setNominations((prev) => [...prev, created].sort((a, b) => b.vote_count - a.vote_count));
      setIsNominateOpen(false);
      setSelectedBook(null);
      setPitch('');
    } catch (err: any) {
      setNominateError(err.message ?? 'Something went wrong while creating the nomination.');
    } finally {
      setNominateLoading(false);
    }
  }

  const filteredNominations = nominations.filter((nomination) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const title = nomination.book.title?.toLowerCase() ?? '';
    const author = nomination.book.author?.toLowerCase() ?? '';

    return title.includes(query) || author.includes(query);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nominations</h1>
        <p className="mt-1 mb-3 text-sm text-slate-400">
          Discover, nominate, and vote on future club reads.
        </p>
        <button
          type="button"
          onClick={() => {
            setNominateError(null);
            setIsNominateOpen(true);
          }}
          disabled={!currentUserId}
          className="inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Nominate a Book +
        </button>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex  gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label htmlFor="nominations-search" className="sr-only">
              Search nominated books
            </label>
            <input
              id="nominations-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or author..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 ring-sky-500 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1"
            />
          </div>
        </div>

        {!currentUserId && (
          <p className="text-[11px] text-slate-500">
            Log in to nominate books and vote on future reads.
          </p>
        )}

        {loading && <p className="text-xs text-slate-500">Loading nominations…</p>}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {!loading && !error && nominations.length === 0 && (
          <p className="text-xs text-slate-500">
            No nominations yet — be the first to nominate a book.
          </p>
        )}

        {!loading && !error && nominations.length > 0 && (
          <>
            {filteredNominations.length === 0 ? (
              <p className="text-xs text-slate-500">No nominations match your search.</p>
            ) : (
              <ul className="space-y-3">
                {filteredNominations.map((nomination) => (
                  <li
                    key={nomination.id}
                    className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
                      {nomination.book.cover_image_url ? (
                        <img
                          src={nomination.book.cover_image_url}
                          alt={`Cover of ${nomination.book.title}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>No cover</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {nomination.book.title}
                          </p>
                          <p className="text-xs text-slate-500">{nomination.book.author}</p>
                        </div>
                        <div className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 whitespace-nowrap">
                          {nomination.vote_count} vote
                          {nomination.vote_count === 1 ? '' : 's'}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{nomination.pitch}</p>
                      {nomination.nominator?.id !== currentUserId && (
                        <>
                          <p className="text-[11px] text-slate-500">
                            Nominated by {nomination.nominator?.name ?? 'Unknown member'}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              type="button"
                              disabled={!currentUserId || updatingId === nomination.id}
                              onClick={() => handleToggleVote(nomination)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                                votedIds.has(nomination.id)
                                  ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                                  : 'border-slate-700 text-slate-300 hover:border-sky-500 hover:text-sky-300'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              <span>⬆</span>
                              <span>{votedIds.has(nomination.id) ? 'Voted' : 'Vote'}</span>
                            </button>
                          </div>
                        </>
                      )}
                      {nomination.nominator?.id === currentUserId && (
                        <div className="mt-2 flex justify-end">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                            Your nomination
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {isNominateOpen && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 px-4 pb-6">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Nominate a Book</h2>
              <button
                type="button"
                onClick={() => {
                  if (!nominateLoading) {
                    setIsNominateOpen(false);
                    setSelectedBook(null);
                    setPitch('');
                    setNominateError(null);
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Search for a book, select it, then share a short pitch about why the club should
                read it (max 500 characters).
              </p>
              <BookSearch onSelect={setSelectedBook} />
              {selectedBook && (
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
                  <p className="font-medium">{selectedBook.title}</p>
                  <p className="text-[11px] text-slate-500">{selectedBook.author}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="pitch" className="text-xs font-medium text-slate-200">
                Pitch
              </label>
              <textarea
                id="pitch"
                rows={3}
                maxLength={500}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
                placeholder="Why should the club read this?"
              />
              <p className="text-[10px] text-slate-500">{pitch.length}/500 characters</p>
            </div>

            {nominateError && <p className="text-xs text-red-400">{nominateError}</p>}

            <button
              type="button"
              onClick={handleCreateNomination}
              disabled={nominateLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {nominateLoading ? 'Submitting…' : 'Submit nomination'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
