'use client';

import { useEffect, useState } from 'react';
import { fetchArchivedBooks, type ArchivedBookWithMeta } from '@/lib/archive';
import { BookCard } from '@/components/BookCard';
import { getCurrentUser } from '@/lib/profile';
import { updateCurrentBookStatus } from '@/lib/readingStatus';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  useEffect(() => {
    getCurrentUser()
      .then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null);
      })
      .catch(() => {
        setCurrentUserId(null);
      });
  }, []);

  async function handleMarkAsRead(bookId: string) {
    if (!currentUserId) return;

    setUpdatingStatus(true);
    setUpdateError(null);
    try {
      await updateCurrentBookStatus(currentUserId, bookId, 'read');
    } catch {
      setUpdateError('Unable to update reading status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
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

      {updateError && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-xs text-red-300">
          {updateError}
        </div>
      )}

      {!loading && !error && archivedBooks.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          No books in the archive yet — the club&apos;s reading history will appear here.
        </div>
      )}

      {!loading && !error && archivedBooks.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {archivedBooks.map((entry) => (
            <li key={entry.id}>
              <BookCard
                title={entry.book.title}
                author={entry.book.author}
                coverImageUrl={entry.book.cover_image_url}
                subtitle={`${MONTH_NAMES[entry.month - 1]} ${entry.year}`}
                className="h-full"
                actionButtonLabel="Mark as read"
                actionButtonLoadingText="Marking…"
                actionButtonDisabled={!currentUserId || updatingStatus}
                actionButtonLoading={updatingStatus}
                onActionButtonClick={() => handleMarkAsRead(entry.book.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
