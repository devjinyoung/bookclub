'use client';

import { useState } from 'react';
import { getLevelBand, levelRank, type LevelInfo, getLevelInfo } from '@/lib/levels';

interface ProgressSectionProps {
  progressError?: string | null;
  title?: string;
  emptyMessage?: string;
  booksRead: number;
}

function LevelProgressBar({ levelInfo }: { levelInfo: LevelInfo }) {
  const band = getLevelBand(levelInfo.level);
  if (!band) return null;

  const { bandStart, bandEnd } = band;
  const clampedBooks = Math.min(Math.max(levelInfo.booksRead, bandStart), bandEnd);
  const progress = bandEnd > bandStart ? (clampedBooks - bandStart) / (bandEnd - bandStart) : 0;
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
}

export function ProgressSection({
  booksRead,
  progressError = null,
  title = 'Your Progress',
  emptyMessage = 'Your current level and books read will appear here once you start logging reads.',
}: ProgressSectionProps) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const levelInfo = getLevelInfo(booksRead);
  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="relative flex items-center">
        <h2 className="font-semibold text-slate-200">{title}</h2>
        <button
          type="button"
          onClick={() => setShowProgressInfo((v) => !v)}
          onMouseEnter={() => setShowProgressInfo(true)}
          onMouseLeave={() => setShowProgressInfo(false)}
          className="flex shrink-0 rounded-full pl-1 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Progress info"
        >
          <img src="/icons/info.png" alt="" className="h-3 w-3 invert" />
        </button>
        {showProgressInfo && (
          <div className="absolute left-0 top-full z-10 mt-1.5 max-w-[280px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 shadow-lg">
            <p>Grasshopper: {'< ' + levelRank.Bookworm} books read</p>
            <p>Bookworm: {levelRank.Bookworm} books read</p>
            <p>Librarian: {levelRank.Librarian} books read</p>
            <p>Shakespeare: {levelRank.Shakespeare} books read</p>
          </div>
        )}
      </div>
      {progressError && <p className="text-xs text-red-400">{progressError}</p>}
      {!progressError && levelInfo && (
        <div className="space-y-2 text-slate-300">
          <p className="flex items-center gap-1">
            <span>Lvl:</span>
            <span className="inline-flex items-center gap-1 font-semibold">
              <>
                <img
                  src={`/icons/${levelInfo.level}.png`}
                  alt={levelInfo.level}
                  className="mx-1 h-6 w-6 invert"
                />
                <span>{levelInfo.level}</span>
              </>
            </span>
          </p>
          {levelInfo.booksToNextLevel !== null ? (
            <LevelProgressBar levelInfo={levelInfo} />
          ) : (
            <p>You&apos;ve reached the highest level!</p>
          )}
        </div>
      )}
      {!progressError && !levelInfo && <p className="text-xs text-slate-500">{emptyMessage}</p>}
    </section>
  );
}
