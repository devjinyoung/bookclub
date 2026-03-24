'use client';

import { useEffect, useRef, useState } from 'react';
import { Label, ListBox, Select } from '@heroui/react';
import ReactCanvasConfetti from 'react-canvas-confetti';
import type { CreateTypes as CanvasConfettiInstance } from 'canvas-confetti';
import {
  fetchCurrentBook,
  type CurrentBookWithMeta,
  updateCurrentBookFromSearchPayload,
} from '@/lib/currentBook';
import { getCurrentUser } from '@/lib/profile';
import { BookSearch, type BookSearchResult } from '@/components/BookSearch';
import {
  fetchCurrentBookStatusSummary,
  updateCurrentBookStatus,
  type ReadingStatus,
} from '@/lib/readingStatus';
import { fetchNominationsWithVotes, type NominationWithMeta } from '@/lib/nominations';
import Link from 'next/link';
import { fetchBooksReadCount, getLevelInfo, levelRank, type LevelInfo } from '@/lib/levels';
import { fetchArchivedBooks, type ArchivedBookWithMeta } from '@/lib/archive';
import ModalComponent from '@/components/Modal';

export default function DashboardPage() {
  const confettiRef = useRef<CanvasConfettiInstance | null>(null);
  const [currentBook, setCurrentBook] = useState<CurrentBookWithMeta | null>(null);
  const [loadingCurrentBook, setLoadingCurrentBook] = useState(true);
  const [currentBookError, setCurrentBookError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [userStatus, setUserStatus] = useState<ReadingStatus | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [mode, setMode] = useState<'set' | 'edit'>('set');

  const [topNominations, setTopNominations] = useState<NominationWithMeta[]>([]);
  const [nominationsError, setNominationsError] = useState<string | null>(null);

  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [recentArchived, setRecentArchived] = useState<ArchivedBookWithMeta[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const [showProgressInfo, setShowProgressInfo] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [{ data }, book] = await Promise.all([getCurrentUser(), fetchCurrentBook()]);

        //TODO: clean up. user should always exist.
        if (!data.user) return;
        setCurrentUserId(data.user.id);
        const count = await fetchBooksReadCount(data.user.id);
        setLevelInfo(getLevelInfo(count));

        if (book) {
          setCurrentBook(book);
          const summary = await fetchCurrentBookStatusSummary(data.user.id, book.book_id);
          setUserStatus(summary.userStatus);
        }
      } catch {
        setCurrentBookError('Unable to load current book.');
      } finally {
        setLoadingCurrentBook(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    fetchNominationsWithVotes()
      .then((data) => {
        setTopNominations(data.slice(0, 3));
      })
      .catch(() => {
        setNominationsError('Unable to load top nominations.');
      });
  }, []);

  useEffect(() => {
    fetchArchivedBooks()
      .then((data) => {
        setRecentArchived(data.slice(0, 3));
      })
      .catch(() => {
        setArchiveError('Unable to load archive.');
      });
  }, []);

  useEffect(() => {
    if (!isModalOpen || !confettiRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const fire = (particleCount: number, angle: number, spread: number, originX: number) => {
      confettiRef.current?.({
        particleCount,
        angle,
        spread,
        startVelocity: 42,
        ticks: 180,
        gravity: 1,
        origin: { x: originX, y: 0.35 },
      });
    };

    fire(80, 55, 70, 0.1);
    const t1 = window.setTimeout(() => fire(70, 125, 70, 0.9), 180);
    const t2 = window.setTimeout(() => fire(90, 90, 90, 0.5), 360);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isModalOpen]);

  async function handleStatusChange(status: ReadingStatus) {
    setUpdatingStatus(true);
    try {
      await updateCurrentBookStatus(currentUserId!, currentBook!.book_id, status);
      const summary = await fetchCurrentBookStatusSummary(currentUserId!, currentBook!.book_id);
      const prevCount = levelInfo!.booksRead;
      const read = status === 'read';
      const newBookCount = read ? prevCount + 1 : prevCount - 1;

      setLevelInfo(getLevelInfo(newBookCount));
      if (
        read &&
        (newBookCount === levelRank.Scholar ||
          newBookCount === levelRank.Librarian ||
          newBookCount === levelRank.Shakespeare)
      ) {
        setIsModalOpen(true);
      }

      setUserStatus(summary.userStatus);
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <ReactCanvasConfetti
        onInit={({ confetti }) => {
          confettiRef.current = confetti;
        }}
        className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        style={{ width: '100%', height: '100%' }}
      />
      <ModalComponent
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        level={levelInfo?.level ?? 'Bookworm'}
      />
      {/* Current Book section */}
      <section className="space-y-3  px-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Currently Reading</h2>
        </div>
        <div className="flex gap-3">
          <div className="flex h-42 w-32 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
            {currentBook && currentBook.cover_image_url ? (
              <img
                src={currentBook.cover_image_url}
                alt={`Cover of ${currentBook.title}`}
                className="h-full w-full"
              />
            ) : (
              <span>Cover</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {loadingCurrentBook && <p className="text-xs text-slate-500">Loading current book…</p>}
            {currentBookError && <p className="text-xs text-red-400">{currentBookError}</p>}
            {!loadingCurrentBook && !currentBookError && (
              <>
                <div>
                  <h1 className="text-xl font-bold text-slate-200">
                    {currentBook ? currentBook.title : 'No book selected'}
                  </h1>
                  <p className="text-base text-slate-200">
                    {currentBook
                      ? currentBook.author
                      : 'When the club picks a book, it will appear here.'}
                  </p>
                </div>
                {currentBook && (
                  <div className="mt-5">
                    <Select
                      placeholder="Select one"
                      onChange={(status) => handleStatusChange(status as ReadingStatus)}
                      value={userStatus}
                      isDisabled={!currentUserId || !currentBook}
                    >
                      <Label className="text-sm text-slate-500">Your reading status:</Label>
                      <Select.Trigger className="bg-slate-900">
                        <Select.Value className="text-slate-200" />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="bg-slate-900">
                        <ListBox>
                          <ListBox.Item id="not_started" textValue="Not Started">
                            Not Started
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="reading" textValue="Reading">
                            Reading
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="read" textValue="Read">
                            Read
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <button
              type="button"
              className="rounded-md border border-slate-700 px-3 py-1 font-medium text-slate-400 hover:bg-slate-800"
              disabled={!currentUserId}
              onClick={() => {
                setMode(currentBook ? 'edit' : 'set');
                setIsConfirmOpen(true);
                setUpdateError(null);
              }}
            >
              Change
            </button>
          </div>
        </div>
      </section>

      {/* Top Nominations */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Top Nominations</h2>
          <Link href="/nominations" className="font-medium text-sky-400 hover:text-sky-300">
            See all →
          </Link>
        </div>
        <p className=" text-slate-500">
          These are books nominated by club members. You can vote on them to help decide the next
          read.
        </p>
        {nominationsError && <p className="text-red-400">{nominationsError}</p>}
        {!nominationsError && topNominations.length === 0 && (
          <p className="text-xs text-slate-500">
            Nominated books with the most votes will appear here.
          </p>
        )}
        {!nominationsError && topNominations.length > 0 && (
          <ul className="space-y-2">
            {topNominations.map((nomination) => (
              <li
                key={nomination.id}
                className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2"
              >
                <div className="flex h-20 w-14 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
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
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className=" text-slate-200">{nomination.book.title}</p>
                      <p className="text-slate-500">{nomination.book.author}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 whitespace-nowrap">
                      {nomination.vote_count} vote
                      {nomination.vote_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="max-w-[240px]">
                    <p className="truncate text-sm text-slate-400">{nomination.pitch}</p>{' '}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Your Progress */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="relative flex items-center">
          <h2 className="font-semibold text-slate-200">Your Progress</h2>
          <button
            type="button"
            onClick={() => setShowProgressInfo((v) => !v)}
            onMouseEnter={() => setShowProgressInfo(true)}
            onMouseLeave={() => setShowProgressInfo(false)}
            className="flex shrink-0 rounded-full text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 pl-1"
            aria-label="Progress info"
          >
            <img src="/icons/info.png" alt="" className="h-3 w-3 invert" />
          </button>
          {showProgressInfo && (
            <div className="absolute left-0 top-full z-10 mt-1.5 max-w-[280px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 shadow-lg">
              Track how many books you&apos;ve read with the club. Complete books to level up from
              Bookworm to Shakespeare!
            </div>
          )}
        </div>
        {progressError && <p className="text-xs text-red-400">{progressError}</p>}
        {!progressError && levelInfo && (
          <div className="space-y-2 text-slate-300">
            <p className="flex items-center gap-1">
              <span>Lvl:</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                {levelInfo.level === 'Bookworm' && (
                  <>
                    <img src="/icons/bookworm.png" alt="Bookworm" className="h-6 w-6 invert mx-1" />
                    <span>Bookworm</span>
                  </>
                )}
                {levelInfo.level === 'Scholar' && (
                  <>
                    <img src="/icons/Scholar.png" alt="Scholar" className="h-6 w-6 invert mx-1" />
                    <span>Scholar</span>
                  </>
                )}
                {levelInfo.level === 'Librarian' && (
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/heart.png" alt="Librarian" className="h-6 w-6 invert mx-1" />
                    <span>Librarian</span>
                  </span>
                )}{' '}
                {levelInfo.level === 'Shakespeare' && '✍️ Shakespeare'}
              </span>
            </p>
            {levelInfo.booksToNextLevel !== null ? (
              <>
                {(() => {
                  // Compute visual progress within the current level band.
                  let bandStart = 0;
                  let bandEnd = 2;
                  if (levelInfo.level === 'Scholar') {
                    bandStart = 2;
                    bandEnd = 4;
                  } else if (levelInfo.level === 'Librarian') {
                    bandStart = 4;
                    bandEnd = 10;
                  }
                  const clampedBooks = Math.min(Math.max(levelInfo.booksRead, bandStart), bandEnd);
                  const progress =
                    bandEnd > bandStart ? (clampedBooks - bandStart) / (bandEnd - bandStart) : 0;
                  const percent = Math.round(progress * 100);
                  return (
                    <div className="space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-[width]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500">
                        {levelInfo.booksToNextLevel === 1
                          ? '1 book away from leveling up!'
                          : `${levelInfo.booksToNextLevel} books away from leveling up!`}
                      </p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <p>You&apos;ve reached the highest level!</p>
            )}
          </div>
        )}
        {!progressError && !levelInfo && (
          <p className="text-xs text-slate-500">
            Your current level and books read will appear here once you start logging reads.
          </p>
        )}
      </section>

      {/* Recent Archive */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className=" font-semibold text-slate-200">Bookclub Archives</h2>
          <Link href="/archive" className="font-medium text-sky-400 hover:text-sky-300">
            See all →
          </Link>
        </div>
        {archiveError && <p className="text-red-400">{archiveError}</p>}
        {!archiveError && recentArchived.length === 0 && (
          <p className="text-xs text-slate-500">
            When the club finishes a book, it will appear here.
          </p>
        )}
        {!archiveError && recentArchived.length > 0 && (
          <ul className="space-y-2">
            {recentArchived.map((entry) => (
              <li
                key={entry.id}
                className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2"
              >
                <div className="flex h-20 w-14  items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
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
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-200">{entry.book.title}</p>
                      <p className="text-slate-500">{entry.book.author}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h2 className="text-sm font-semibold text-slate-200">
              {mode === 'set' ? 'Set current book' : 'Replace current book'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'set'
                ? "You're about to set the club's current book. The current nominations list will not be affected unless this book was nominated."
                : "You're about to replace the current book. The previous book will be moved to the archive."}
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-sky-500 px-3 py-1 font-medium text-slate-950 hover:bg-sky-400"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setIsSearchOpen(true);
                  setSelectedBook(null);
                  setUpdateError(null);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 px-4 pb-6">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                {mode === 'set' ? 'Set current book' : 'Edit current book'}
              </h2>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-200"
                disabled={updating}
                onClick={() => {
                  setIsSearchOpen(false);
                  setSelectedBook(null);
                  setUpdateError(null);
                }}
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Search for a book, then select it to make it the club&apos;s current read.
            </p>

            <BookSearch onSelect={setSelectedBook} />

            {selectedBook && (
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
                <p className="font-medium">{selectedBook.title}</p>
                <p className="text-[11px] text-slate-500">{selectedBook.author}</p>
              </div>
            )}

            {updateError && <p className="text-xs text-red-400">{updateError}</p>}

            <button
              type="button"
              disabled={updating || !selectedBook || !currentUserId}
              onClick={async () => {
                if (!selectedBook || !currentUserId) return;

                setUpdating(true);
                setUpdateError(null);
                try {
                  const updated = await updateCurrentBookFromSearchPayload(
                    {
                      googleBooksId: selectedBook.googleBooksId,
                      title: selectedBook.title,
                      author: selectedBook.author,
                      coverImageUrl: selectedBook.coverImageUrl,
                    },
                    currentUserId,
                  );
                  setCurrentBook(updated);
                  setIsSearchOpen(false);
                  setSelectedBook(null);
                } catch (err: any) {
                  setUpdateError(
                    err.message ?? 'Something went wrong while updating the current book.',
                  );
                } finally {
                  setUpdating(false);
                }
              }}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {updating
                ? mode === 'set'
                  ? 'Setting current book…'
                  : 'Updating current book…'
                : mode === 'set'
                  ? 'Set current book'
                  : 'Update current book'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
