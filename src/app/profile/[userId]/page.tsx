'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProfileById } from '@/lib/profile';
import { fetchBooksReadCount, getLevelInfo, type LevelInfo } from '@/lib/levels';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import { BookCard } from '@/components/BookCard';
import type { Profile } from '@/lib/profile';

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

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        {levelInfo && (
          <p className="text-lg text-slate-400 flex items-center gap-1">
            <span>Lvl:</span>
            {levelInfo.level === 'Bookworm' && (
              <span className="inline-flex items-center gap-1">
                <img src="/icons/bookworm.png" alt="Bookworm" className="h-6 w-6 invert mx-1" />
                <span>Bookworm</span>
              </span>
            )}{' '}
            {levelInfo.level === 'Scholar' && (
              <span className="inline-flex items-center gap-1">
                <img src="/icons/Scholar.png" alt="Scholar" className="h-6 w-6 invert mx-1" />
                <span>Scholar</span>
              </span>
            )}
            {levelInfo.level === 'Librarian' && (
              <span className="inline-flex items-center gap-1">
                <img src="/icons/heart.png" alt="Librarian" className="h-6 w-6 invert mx-1" />
                <span>Librarian</span>
              </span>
            )}
            {levelInfo.level === 'Shakespeare' && '✍️ Shakespeare'}
          </p>
        )}
        {progressError && <p className="text-xs text-red-400">{progressError}</p>}
        {levelInfo && levelInfo.booksToNextLevel !== null ? (
          <>
            <p></p>
            {(() => {
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
                  <p className="text-slate-500">
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
        {!progressError && !levelInfo && (
          <p className="text-xs text-slate-500">
            This member&apos;s level and books read will appear here once they start logging reads.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-2 text-lg">
          Books
          {readBooks.length > 0 && !readBooksLoading && <span> ({readBooks.length})</span>}
        </h1>

        {readBooksLoading && <p className="text-slate-500">Loading reading history…</p>}

        {readBooksError && <p className="text-sm text-red-400">{readBooksError}</p>}

        {!readBooksLoading && !readBooksError && readBooks.length === 0 && (
          <p className="text-xs text-slate-500">
            When this member marks club books as read, they&apos;ll appear here.
          </p>
        )}

        {!readBooksLoading && !readBooksError && readBooks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {readBooks.map((book) => (
              <BookCard
                key={book.id}
                title={book.title}
                author={book.author}
                coverImageUrl={book.coverImageUrl}
                className="bg-slate-950/60"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
