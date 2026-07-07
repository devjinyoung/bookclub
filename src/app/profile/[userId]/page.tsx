'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProfileById } from '@/lib/profile';
import { fetchBooksReadCount, getLevelInfo, type LevelInfo } from '@/lib/levels';
import { ProfileView } from '@/components/ProfileView';
import type { Profile } from '@/lib/profile';
import { ProgressSection } from '@/components/ProgressSection';
import { ReadBooks } from '@/components/ReadBooks';

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [booksread, setBooksRead] = useState<number>(0);

  useEffect(() => {
    getProfileById(userId)
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        console.error('Unable to load profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    async function loadProgress() {
      try {
        const count = await fetchBooksReadCount(userId);
        setBooksRead(count);
      } catch {
        console.error('Unable to load reading progress.');
      }
    }

    loadProgress();
  }, [userId]);

  return (
    <section>
      <div className="flex flex-col gap-4">
        {!loading && profile && <ProfileView profile={profile} />}
        <ProgressSection booksRead={booksread} title={`${profile?.name}'s progress`} />
        <ReadBooks userId={userId} />
      </div>
    </section>
  );
}
