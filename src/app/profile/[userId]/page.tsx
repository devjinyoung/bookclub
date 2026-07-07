'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProfileById } from '@/lib/profile';
import { fetchBooksReadCount, getLevelInfo, type LevelInfo } from '@/lib/levels';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import { BookCard } from '@/components/BookCard';
import { ProgressSection } from '@/components/ProgressSection';
import type { Profile } from '@/lib/profile';
import { updateCurrentBookStatus } from '@/lib/readingStatus';

interface ReadBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [readBooks, setReadBooks] = useState<ReadBook[]>([]);
  const [readBooksLoading, setReadBooksLoading] = useState(true);
  const [readBooksError, setReadBooksError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    getProfileById(userId)
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setError('Unable to load profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    async function loadProgress() {
      try {
        const count = await fetchBooksReadCount(userId);
        setLevelInfo(getLevelInfo(count));
      } catch {
        setProgressError('Unable to load reading progress.');
      }
    }

    loadProgress();
  }, [userId]);

  useEffect(() => {
    //TODO: move to different file.
    async function loadReadBooks() {
      try {
        const { data, error } = await supabaseBrowserClient
          .from('reading_statuses')
          .select(
            `
            book:books (
              id,
              title,
              author,
              cover_image_url
            )
          `,
          )
          .eq('user_id', userId)
          .eq('status', 'read');

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as any[];
        const mapped: ReadBook[] = rows
          .map((row) => row.book)
          .filter(Boolean)
          .map((book) => ({
            id: book.id as string,
            title: book.title as string,
            author: book.author as string,
            coverImageUrl: (book.cover_image_url as string | null | undefined) ?? null,
          }));

        setReadBooks(mapped);
      } catch {
        setReadBooksError('Unable to load books this member has read.');
      } finally {
        setReadBooksLoading(false);
      }
    }

    loadReadBooks();
  }, [userId]);

  const initials =
    profile?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') ?? '?';

  const memberSince = (() => {
    if (!profile?.created_at) {
      return null;
    }
    const joinedDate = new Date(profile.created_at);
    if (Number.isNaN(joinedDate.getTime())) {
      return null;
    }

    return `Member since ${joinedDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })}`;
  })();

  async function handleMarkAsRead(bookId: string) {
    setUpdatingStatus(true);
    setUpdateError(null);
    try {
      await updateCurrentBookStatus(profile!.id!, bookId, 'reading');
      setReadBooks((prev) => prev.filter((book) => book.id !== bookId));
    } catch {
      setUpdateError('Unable to update reading status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${profile.name} avatar`}
              className="h-27 w-27 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-27 w-27 items-center justify-center rounded-full bg-sky-500 text-base font-semibold text-slate-950">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile?.name ?? 'Member'}</h1>
            <div>
              {memberSince && <p className="text-sm text-slate-500">{memberSince}</p>}
              <p className="mt-2 text-slate-400">{profile?.bio}</p>
            </div>
          </div>
        </div>
      </header>

      <ProgressSection
        levelInfo={levelInfo}
        progressError={progressError}
        emptyMessage="This member's level and books read will appear here once they start logging reads."
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-2 text-lg">
          Books
          {readBooks.length > 0 && !readBooksLoading && <span> ({readBooks.length})</span>}
        </h1>

        {readBooksLoading && <p className="text-slate-500">Loading reading history…</p>}

        {readBooksError && <p className="text-sm text-red-400">{readBooksError}</p>}

        {!readBooksLoading && !readBooksError && readBooks.length === 0 && (
          <p className="text-xs text-slate-500">No books read yet.</p>
        )}
        {updateError && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-xs text-red-300">
            {updateError}
          </div>
        )}

        {!readBooksLoading && !readBooksError && readBooks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {readBooks.map((book) => (
              <BookCard
                key={book.id}
                title={book.title}
                author={book.author}
                coverImageUrl={book.coverImageUrl}
                actionButtonLabel="Mark as unread"
                onActionButtonClick={() => handleMarkAsRead(book.id)}
                actionButtonDisabled={updatingStatus}
                actionButtonLoading={updatingStatus}
                className="bg-slate-950/60"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
