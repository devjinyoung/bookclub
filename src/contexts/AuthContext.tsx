'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/profile';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

type AuthContextValue = {
  user: User | null;
  currentUserId: string | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then(({ data }) => {
        if (!isActive) return;
        setUser(data.user ?? null);
      })
      .catch(() => {
        if (!isActive) return;
        setUser(null);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, currentUserId: user?.id ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
