'use client';

import { BookCard } from '@/components/BookCard';
import { ProgressSection } from '@/components/ProgressSection';
import type { LevelInfo } from '@/lib/levels';
import type { Profile } from '@/lib/profile';

function getInitials(name: string | undefined | null): string {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') ?? '?'
  );
}

function formatMemberSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) {
    return null;
  }

  const joinedDate = new Date(createdAt);
  if (Number.isNaN(joinedDate.getTime())) {
    return null;
  }

  return `Member since ${joinedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })}`;
}

interface ProfileViewProps {
  profile: Profile;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const initials = getInitials(profile?.name);
  const memberSince = formatMemberSince(profile?.created_at);

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
    </div>
  );
}
