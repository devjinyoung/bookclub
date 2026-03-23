'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProfileById, updateProfile } from '@/lib/profile';
import { fetchBooksReadCount, getLevelInfo, type LevelInfo } from '@/lib/levels';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import { BookCard } from '@/components/BookCard';
import EditProfileForm from '@/components/EditProfileForm';

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface ReadBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [readBooks, setReadBooks] = useState<ReadBook[]>([]);
  const [readBooksLoading, setReadBooksLoading] = useState(true);
  const [readBooksError, setReadBooksError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const isOwnProfile = Boolean(currentUserId && userId && currentUserId === userId);

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

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await supabaseBrowserClient.auth.signOut();
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'bookclub-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      router.replace('/login');
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
            <div className="max-w-[200px]">
              <p className="text-[10px] text-slate-400">
                {profile?.bio || 'This member hasn’t written a bio yet.'}
              </p>
            </div>
          </div>
        </div>
        {isOwnProfile && profile && !isEditingProfile && (
          <button
            type="button"
            className="rounded-md border border-slate-700 px-3 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-800"
            onClick={() => setIsEditingProfile(true)}
          >
            Edit profile
          </button>
        )}
      </header>

      {isOwnProfile && isEditingProfile && profile && (
        <EditProfileForm
          initialName={profile.name}
          initialBio={profile.bio}
          initialAvatarUrl={profile.avatar_url}
          onCancel={() => setIsEditingProfile(false)}
          onSave={async ({ name, bio, avatar }) => {
            const updated = await updateProfile({ userId, name, bio, avatar });
            setProfile(updated);
            setIsEditingProfile(false);
          }}
        />
      )}

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        {levelInfo && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span>Level:</span>
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
                  <p className="text-[11px] text-slate-500">
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

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <h1 className="mb-2">
          Books
          {readBooks.length > 0 && !readBooksLoading && <span> ({readBooks.length})</span>}
        </h1>

        {readBooksLoading && <p className="text-xs text-slate-500">Loading reading history…</p>}

        {readBooksError && <p className="text-xs text-red-400">{readBooksError}</p>}

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
      {isOwnProfile && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-md border border-slate-700 px-3 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-800"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      )}
    </div>
  );
}
