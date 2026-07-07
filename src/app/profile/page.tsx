'use client';
import { useEffect, useState } from 'react';

import { useProfile } from '@/contexts/ProfileContext';
import { ProfileView } from '@/components/ProfileView';
import { ProgressSection } from '@/components/ProgressSection';
import { getLevelInfo, type LevelInfo } from '@/lib/levels';
import { ReadBooks } from '@/components/ReadBooks';

export default function MyProfile() {
  const { profile, isLoading, booksRead, setBooksRead } = useProfile();
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);

  useEffect(() => {
    try {
      if (!isLoading && profile) {
        setLevelInfo(getLevelInfo(booksRead));
      }
    } catch (error) {
      console.error('Unable to load reading progress.');
    }
  }, [isLoading, profile, booksRead]);

  function handleUnread() {
    setBooksRead(booksRead - 1);
  }
  if (isLoading || !profile) {
    return <p>Loading...</p>;
  }

  return (
    <section>
      <div className="flex flex-col gap-4">
        <ProfileView profile={profile} />
        <ProgressSection booksRead={booksRead} />
        <ReadBooks userId={profile!.id} handleUnread={handleUnread} />
      </div>
    </section>
  );
}
