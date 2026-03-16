'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProfileById } from '@/lib/profile';
import { fetchBooksReadCount, getLevelInfo, type LevelInfo } from '@/lib/levels';

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

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

  const initials =
    profile?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') ?? '?';

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-base font-semibold text-slate-950">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile?.name ?? 'Member'}</h1>
          {levelInfo && (
            <p className="mt-1 text-xs text-slate-400">
              {levelInfo.level === 'Bookworm' && (
                <span className="inline-flex items-center gap-1">
                  <img src="/icons/bookworm.png" alt="Bookworm" className="h-6 w-6 invert mr-1" />
                  <span>Bookworm</span>
                </span>
              )}{' '}
              {levelInfo.level === 'Scholar' && '📖 Scholar'}
              {levelInfo.level === 'Librarian' && '📚 Librarian'}
              {levelInfo.level === 'Shakespeare' && '✍️ Shakespeare'}
            </p>
          )}
        </div>
      </header>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-200">About</h2>
        {loading && <p className="text-slate-500">Loading profile…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && (
          <p className="text-slate-300">
            {profile?.bio || 'This member hasn’t written a bio yet.'}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-200">Reading Progress</h2>
        {progressError && <p className="text-xs text-red-400">{progressError}</p>}
        {!progressError && levelInfo && (
          <div className="space-y-2 text-xs text-slate-300">
            <p>Books read: {levelInfo.booksRead}</p>
            {levelInfo.booksToNextLevel !== null ? (
              <>
                <p>
                  {levelInfo.booksToNextLevel === 1
                    ? '1 book away from the next level.'
                    : `${levelInfo.booksToNextLevel} books away from the next level.`}
                </p>
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
                        {percent}% of this level completed.
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
            This member&apos;s level and books read will appear here once they start logging reads.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Reading history and nominations will be added in a later phase.
      </section>
    </div>
  );
}
