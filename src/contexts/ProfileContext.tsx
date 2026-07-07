'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBooksReadCount } from '@/lib/levels';
import { getProfileById, type Profile } from '@/lib/profile';

type ProfileContextValue = {
  profile: Profile | null;
  booksRead: number;
  isLoading: boolean;
  setProfile: (profile: Profile) => void;
  setBooksRead: (count: number) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { currentUserId, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booksRead, setBooksRead] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;

    let isActive = true;
    setIsLoading(true);

    if (!currentUserId) {
      setProfile(null);
      setBooksRead(0);
      setIsLoading(false);
      return;
    }

    Promise.all([getProfileById(currentUserId), fetchBooksReadCount(currentUserId)])
      .then(([profileData, count]) => {
        if (!isActive) return;
        setProfile(profileData);
        setBooksRead(count);
      })
      .catch(() => {
        if (!isActive) return;
        setProfile(null);
        setBooksRead(0);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentUserId, isAuthLoading]);

  return (
    <ProfileContext.Provider value={{ profile, booksRead, isLoading, setProfile, setBooksRead }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
